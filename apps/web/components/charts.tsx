"use client";

// Small, dependency-free SVG charts following the dataviz method: thin marks,
// rounded data ends, 2px surface gaps, recessive hairline grid, a legend for
// two or more series, hover tooltips, and a table view for every chart.

import { useId, useState } from "react";

const W = 720;
const H = 260;
const PAD = { top: 16, right: 12, bottom: 30, left: 60 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= v) return m * exp;
  return 10 * exp;
}
const compact = (v: number) => (v >= 1_000_000 ? `${+(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${+(v / 1_000).toFixed(1)}K` : String(Math.round(v)));
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function Grid({ max, prefix }: { max: number; prefix: string }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  return (
    <g aria-hidden="true">
      {ticks.map((t) => {
        const y = PAD.top + plotH - (t / max) * plotH;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y} textAnchor="end" dominantBaseline="central" fontSize="13" fill="var(--muted)">
              {prefix}
              {compact(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Tooltip({ x, children }: { x: number; children: React.ReactNode }) {
  const left = `${(x / W) * 100}%`;
  return (
    <div
      className="pointer-events-none absolute bottom-full z-10 mb-2 w-max min-w-[180px] -translate-x-1/2 whitespace-nowrap rounded-xl bg-surface px-3 py-2 text-sm shadow-card ring-1 ring-line"
      style={{ left: `clamp(110px, ${left}, calc(100% - 110px))` }}
      role="status"
    >
      {children}
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 flex-none rounded-sm" style={{ background: color }} />;
}

function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-accent">Show as a table</summary>
      <div className="mt-2 max-h-72 overflow-auto">
        <table className="data">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={h} className={i ? "r" : undefined}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={j ? "r num" : undefined}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export type ColumnRow = { label: string; iso: string; a: number; b: number; rest: number };

/** Stacked weekly columns: paid by member (a), covered by circle (b), not paid (rest). Values in shillings. */
export function CollectionsChart({ rows, labels }: { rows: ColumnRow[]; labels: { a: string; b: string; rest: string } }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const max = niceMax(Math.max(...rows.map((r) => r.a + r.b + r.rest), 1));
  const band = plotW / Math.max(rows.length, 1);
  const barW = Math.min(24, band - 4);
  const y = (v: number) => (v / max) * plotH;
  const fmt = (v: number) => `KSh ${Math.round(v).toLocaleString("en-US")}`;
  const every = Math.ceil(rows.length / 8);

  return (
    <figure className="grid gap-3" aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="sr-only">
        Weekly repayments by who paid
      </figcaption>
      <ul className="flex flex-wrap gap-4 text-sm text-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <Swatch color="var(--series-1)" /> {labels.a}
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch color="var(--series-2)" /> {labels.b}
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch color="var(--series-none)" /> {labels.rest}
        </li>
      </ul>
      <div className="relative">
        {hover !== null && rows[hover] && (
          <Tooltip x={PAD.left + band * hover + band / 2}>
            <div className="font-medium">Week of {shortDate(rows[hover].iso)}</div>
            {[
              [labels.a, rows[hover].a, "var(--series-1)"],
              [labels.b, rows[hover].b, "var(--series-2)"],
              [labels.rest, rows[hover].rest, "var(--series-none)"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted">
                  <Swatch color={c as string} /> {l}
                </span>
                <span className="num">{fmt(v as number)}</span>
              </div>
            ))}
          </Tooltip>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly repayments, stacked by who paid" onMouseLeave={() => setHover(null)}>
          <Grid max={max} prefix="" />
          {rows.map((r, i) => {
            const x = PAD.left + band * i + (band - barW) / 2;
            const base = PAD.top + plotH;
            const segs = [
              { v: r.a, c: "var(--series-1)" },
              { v: r.b, c: "var(--series-2)" },
              { v: r.rest, c: "var(--series-none)" },
            ].filter((s) => s.v > 0);
            let top = base;
            return (
              <g key={r.iso} opacity={hover === null || hover === i ? 1 : 0.45}>
                {segs.map((s, j) => {
                  const h = Math.max(0, y(s.v) - (j > 0 ? 2 : 0));
                  top -= y(s.v);
                  const isTop = j === segs.length - 1;
                  const yy = top + (j > 0 ? 0 : 0);
                  return isTop ? (
                    <path
                      key={j}
                      d={`M${x},${yy + h} V${yy + Math.min(4, h)} Q${x},${yy} ${x + Math.min(4, barW / 2)},${yy} H${x + barW - Math.min(4, barW / 2)} Q${x + barW},${yy} ${x + barW},${yy + Math.min(4, h)} V${yy + h} Z`}
                      fill={s.c}
                    />
                  ) : (
                    <rect key={j} x={x} y={yy} width={barW} height={h} fill={s.c} />
                  );
                })}
                {i % every === 0 && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="13" fill="var(--muted)">
                    {r.label}
                  </text>
                )}
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
              </g>
            );
          })}
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="var(--muted)" strokeOpacity="0.4" strokeWidth="1" />
        </svg>
      </div>
      <TableView
        caption="Weekly repayments by who paid"
        head={["Week of", labels.a, labels.b, labels.rest]}
        rows={rows.map((r) => [shortDate(r.iso), fmt(r.a), fmt(r.b), fmt(r.rest)])}
      />
    </figure>
  );
}

export type LinePoint = { iso: string; value: number };

/** One series over time as a stepped line with a light wash, plus crosshair tooltip. */
export function BalanceChart({ points, label, today }: { points: LinePoint[]; label: string; today: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const series = points.length ? [...points, { iso: today, value: points[points.length - 1]!.value }] : [];
  const t0 = series.length ? new Date(series[0]!.iso).getTime() : 0;
  const t1 = series.length ? Math.max(new Date(series[series.length - 1]!.iso).getTime(), t0 + 1) : 1;
  const max = niceMax(Math.max(...series.map((p) => p.value), 1));
  const px = (iso: string) => PAD.left + ((new Date(iso).getTime() - t0) / (t1 - t0)) * plotW;
  const py = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const fmt = (v: number) => `KSh ${Math.round(v).toLocaleString("en-US")}`;

  let d = "";
  series.forEach((p, i) => {
    const x = px(p.iso);
    const yv = py(p.value);
    d += i === 0 ? `M${x},${yv}` : ` H${x} V${yv}`;
  });
  const area = series.length ? `${d} V${PAD.top + plotH} H${px(series[0]!.iso)} Z` : "";
  const last = series[series.length - 1];
  const ticks = series.length ? [0, 0.5, 1].map((f) => new Date(t0 + f * (t1 - t0)).toISOString()) : [];

  return (
    <figure className="grid gap-3">
      <div className="relative">
        {hover !== null && points[hover] && (
          <Tooltip x={px(points[hover].iso)}>
            <div className="font-medium">{shortDate(points[hover].iso)}</div>
            <div className="num">{fmt(points[hover].value)}</div>
          </Tooltip>
        )}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`${label} over time`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width) * W;
            let best = 0;
            points.forEach((p, i) => {
              if (Math.abs(px(p.iso) - x) < Math.abs(px(points[best]!.iso) - x)) best = i;
            });
            setHover(points.length ? best : null);
          }}
        >
          <Grid max={max} prefix="" />
          <path d={area} fill="var(--series-1)" opacity="0.1" />
          <path d={d} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && points[hover] && (
            <>
              <line x1={px(points[hover].iso)} x2={px(points[hover].iso)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--muted)" strokeOpacity="0.5" />
              <circle cx={px(points[hover].iso)} cy={py(points[hover].value)} r="5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
            </>
          )}
          {last && <circle cx={px(last.iso)} cy={py(last.value)} r="4.5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />}
          {ticks.map((t, i) => (
            <text key={t} x={i === 0 ? PAD.left : i === 2 ? W - PAD.right : px(t)} y={H - 8} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fontSize="13" fill="var(--muted)">
              {shortDate(t)}
            </text>
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="var(--muted)" strokeOpacity="0.4" strokeWidth="1" />
        </svg>
      </div>
      <TableView caption={`${label} over time`} head={["Date", label]} rows={points.map((p) => [shortDate(p.iso), fmt(p.value)])} />
    </figure>
  );
}
