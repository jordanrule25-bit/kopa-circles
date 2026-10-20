import { aprFromFlatFee } from "@kopa/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lendToCircle } from "@/app/lend-actions";
import { CircleCover } from "@/components/circle-cover";
import { LendForm } from "@/components/lend-form";
import { GrowthStage, Leaf } from "@/components/plants";
import { Back, Chip, Note, Panel, Progress, Score, Stat, Stats } from "@/components/ui";
import { loadCircle, statusChip, summarize } from "@/lib/circles";
import { date, kes, ordinal, pct, usd, usd0 } from "@/lib/format";
import { currentFx } from "@/lib/fx";
import { currentUser } from "@/lib/session";
import { circleTimeline } from "@/lib/timeline";

/** Updates shown before "Show earlier updates". */
const SHOWN = 6;

const TONE = { good: "var(--accent)", sun: "var(--sun)", bad: "var(--bad)", neutral: "var(--line)" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const c = await loadCircle((await params).id);
  return { title: c?.name ?? "Circle" };
}

export default async function CirclePublic({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, user] = await Promise.all([loadCircle(id), currentUser()]);
  if (!c || !["RAISING", "REPAYING", "COMPLETE"].includes(c.status)) notFound();
  const today = new Date();
  const s = summarize(c, today);
  const st = statusChip(c, s);
  const fx = currentFx();
  const mine = user?.lender ? c.shares.filter((x) => x.lenderId === user.id) : [];
  const mineCents = mine.reduce((t, x) => t + x.amountCents, 0);
  const remaining = Math.max(0, s.targetCents - s.fundedCents);
  const lenders = new Set(c.shares.map((x) => x.lenderId)).size;
  const borrowers = s.members.filter((m) => m.loan);
  const timeline = circleTimeline(c, today);

  return (
    <div className="grid gap-8">
      <div className="grid gap-5">
        <Back href="/">All circles</Back>
        <CircleCover id={c.id} names={borrowers.map((m) => m.name)} size="lg" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold sm:text-5xl">{c.name}</h1>
            <p className="mt-1 text-lg text-muted">
              {c.town}, Kenya · {c.sector} · {ordinal(c.cycle)} loan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GrowthStage status={c.status} size={30} />
            <Chip tone={st.tone}>{st.label}</Chip>
            <Score score={c.score} />
          </div>
        </div>
        <p className="max-w-3xl text-lg leading-relaxed">{c.story}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="grid gap-6">
          <Stats>
            <Stat label="Raising" value={usd0(s.targetCents)} sub={`${kes(s.principalKes)} for ${borrowers.length} people`} />
            <Stat label="Lenders" value={lenders} sub={`${usd0(s.fundedCents)} lent so far`} />
            <Stat label="Repaid" value={pct(s.totalDueKes ? s.paidKes / s.totalDueKes : 0)} sub={s.disbursedAt ? `Week ${s.week} of 26` : "Starts after funding"} />
          </Stats>

          <Panel>
            <h2 className="text-xl font-semibold">The people</h2>
            <ul className="grid gap-1">
              {borrowers.map((m) => {
                const loan = m.loan!;
                const status =
                  m.state === "pending"
                    ? "Waiting for funding"
                    : m.state === "late"
                      ? "Catching up"
                      : loan.status === "CLOSED"
                        ? "Repaid in full"
                        : m.coveredKes > 0
                          ? "On track, with help from the circle"
                          : "On track";
                return (
                  <li key={m.id} className="flex items-center gap-4 border-b border-line py-3 last:border-0">
                    <span className={m.state === "late" ? "rotate-[100deg]" : ""}>
                      <Leaf size={22} color={m.state === "late" ? "var(--bad)" : m.state === "pending" ? "var(--line)" : "var(--accent)"} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{m.name.split(" ")[0]}</div>
                      <div className="text-sm text-muted">{m.business}</div>
                    </div>
                    <div className="text-right">
                      <div className="num font-medium">{usd0(loan.listedUsdCents)}</div>
                      <div className="text-xs text-muted">{status}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Note>
              First names only. Each member repays weekly at the circle meeting for 26 weeks. Members are fictional sample borrowers.
            </Note>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold">Updates</h2>
            <ol className="relative grid gap-0" aria-label="Circle updates, newest first">
              {timeline.slice(0, SHOWN).map((t, i) => (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 h-3 w-3 flex-none rounded-full" style={{ background: TONE[t.tone] }} />
                    {i < Math.min(SHOWN, timeline.length) - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{t.title}</span>
                      <span className="text-sm text-muted">{date(t.at)}</span>
                    </div>
                    {t.detail && <div className="text-sm text-muted">{t.detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
            {timeline.length > SHOWN && (
              <details className="group">
                <summary className="cursor-pointer list-none font-medium text-accent [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show {timeline.length - SHOWN} earlier updates</span>
                  <span className="hidden group-open:inline">Hide earlier updates</span>
                </summary>
                <ol className="mt-4 grid gap-3" aria-label="Earlier updates">
                  {timeline.slice(SHOWN).map((t, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="mt-1.5 h-3 w-3 flex-none rounded-full" style={{ background: TONE[t.tone] }} />
                      <div>
                        <span className="font-medium">{t.title}</span> <span className="text-sm text-muted">{date(t.at)}</span>
                        {t.detail && <div className="text-sm text-muted">{t.detail}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </Panel>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-20">
          <Panel>
            {c.status === "RAISING" ? (
              <>
                <div>
                  <div className="num text-3xl font-semibold tracking-tight">{usd0(remaining)}</div>
                  <div className="text-muted">still needed of {usd0(s.targetCents)}</div>
                </div>
                <Progress value={s.targetCents ? s.fundedCents / s.targetCents : 0} tone="sun" label="Funded" />
                {user?.lender ? (
                  <LendForm action={lendToCircle.bind(null, c.id)} remainingCents={remaining} balanceCents={user.lender.balanceCents} circleName={c.name} />
                ) : (
                  <Link href={`/signin?next=/circles/${c.id}`} className="rounded-full bg-accent py-2.5 text-center font-medium text-accent-ink hover:brightness-110">
                    Sign in to lend
                  </Link>
                )}
              </>
            ) : (
              <>
                <div>
                  <div className="num text-3xl font-semibold tracking-tight">{pct(s.totalDueKes ? s.paidKes / s.totalDueKes : 0)}</div>
                  <div className="text-muted">repaid so far</div>
                </div>
                <Progress value={s.totalDueKes ? s.paidKes / s.totalDueKes : 0} label="Repaid" />
                <p className="text-sm text-muted">This circle is fully funded. New circles are raising on the Lend page.</p>
              </>
            )}
          </Panel>
          {mineCents > 0 && (
            <Panel>
              <div className="label">Your share</div>
              <div className="num text-2xl font-semibold">{usd(mineCents)}</div>
              <div className="text-sm text-muted">{usd(mine.reduce((t, x) => t + x.repaidCents, 0))} repaid to you so far</div>
            </Panel>
          )}
          <Note>
            Borrowers pay a flat 7% fee, about {pct(aprFromFlatFee(700, 26))} APR. Lenders earn 0% and carry exchange-rate risk at about KSh {fx.kesPerUsd} per
            dollar. If a payment is missed, the circle covers first, then the reserve, then lenders.
          </Note>
        </aside>
      </div>
    </div>
  );
}
