import Link from "next/link";
import { Chip, Empty, PageHead, Panel, Progress } from "@/components/ui";
import { loadCircles, statusChip, summarize } from "@/lib/circles";
import { kes, pct } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Repaying" };

export default async function Repaying() {
  await requireAdmin();
  const circles = await loadCircles({ status: { in: ["REPAYING", "COMPLETE"] } });
  const today = new Date();
  const rows = circles.map((c) => ({ c, s: summarize(c, today) })).sort((a, b) => b.s.late - a.s.late);
  const arrears = rows.reduce((t, r) => t + r.s.members.reduce((u, m) => u + m.arrearsKes, 0), 0);

  return (
    <>
      <PageHead title="Repaying circles" sub={`Record each weekly meeting. ${kes(arrears)} in arrears across all circles.`} />
      {rows.length === 0 ? (
        <Empty title="No circles repaying yet" />
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Circle</th>
                  <th>Status</th>
                  <th className="r">Week</th>
                  <th className="r">Due weekly</th>
                  <th className="r">Arrears</th>
                  <th className="min-w-[120px]">Repaid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, s }) => {
                  const st = statusChip(c, s);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/circles/${c.id}`} className="font-medium text-accent hover:underline">
                          {c.name}
                        </Link>
                        <div className="text-xs text-muted">
                          {c.town} · agent {c.agent.town}
                        </div>
                      </td>
                      <td>
                        <Chip tone={st.tone}>{st.label}</Chip>
                      </td>
                      <td className="r num">{s.week} / 26</td>
                      <td className="r num">{kes(s.weeklyKes)}</td>
                      <td className="r num">{kes(s.members.reduce((t, m) => t + m.arrearsKes, 0))}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Progress value={s.totalDueKes ? s.paidKes / s.totalDueKes : 0} />
                          <span className="num text-xs">{pct(s.totalDueKes ? s.paidKes / s.totalDueKes : 0)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
