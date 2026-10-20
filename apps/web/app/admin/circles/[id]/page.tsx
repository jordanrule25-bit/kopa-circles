import { installmentKes } from "@kopa/core";
import { notFound } from "next/navigation";
import { closeDefault, meeting } from "@/app/admin/actions";
import { ActionForm } from "@/components/action-form";
import { Back, Chip, Note, PageHead, Panel, Stat, Stats } from "@/components/ui";
import { loadCircle, statusChip, summarize } from "@/lib/circles";
import { todayIso } from "@/lib/dates";
import { date, kes, usd } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export default async function AdminCircle({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const c = await loadCircle(id);
  if (!c) notFound();
  const today = new Date();
  const s = summarize(c, today);
  const st = statusChip(c, s);
  const repaying = s.members.filter((m) => m.loan?.status === "REPAYING");
  const nextDue = (m: (typeof s.members)[number]) => m.loan?.installments.find((i) => i.paidKesCents < i.amountKesCents);

  return (
    <div className="grid gap-5">
      <div>
        <Back href="/admin/repaying">Repaying circles</Back>
        <PageHead title={c.name} sub={`${c.town} · ${c.sector} · loan ${c.cycle} · ${c.agent.partner.name}`} action={<Chip tone={st.tone}>{st.label}</Chip>} />
      </div>

      <Stats>
        <Stat label="Week" value={`${s.week} / 26`} sub={s.disbursedAt ? `Disbursed ${date(s.disbursedAt)}` : "Not disbursed"} />
        <Stat label="Due each week" value={kes(s.weeklyKes)} sub={`${repaying.length} members repaying`} />
        <Stat label="Collected" value={kes(s.paidKes)} sub={`of ${kes(s.totalDueKes)}`} />
        <Stat label="Arrears" value={kes(s.members.reduce((t, m) => t + m.arrearsKes, 0))} sub={`${s.late} members behind`} />
      </Stats>

      {c.status === "REPAYING" && repaying.length > 0 && (
        <Panel>
          <div>
            <h2 className="text-lg font-semibold">Record this week’s meeting</h2>
            <p className="text-sm text-muted">
              Prefilled with what each member owes now (oldest installment first, including arrears). Change any amount. Use “Circle covered” when
              the others pay for a member.
            </p>
          </div>
          <ActionForm action={meeting.bind(null, c.id)} label="Save meeting" pendingLabel="Saving…">
            <label className="field max-w-[220px]">
              <span>Meeting date</span>
              <input type="date" name="on" defaultValue={todayIso()} required />
            </label>
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th className="r">Weekly</th>
                    <th className="r">Owed now</th>
                    <th className="r">Paid by member (KSh)</th>
                    <th className="r">Circle covered (KSh)</th>
                  </tr>
                </thead>
                <tbody>
                  {repaying.map((m) => {
                    const weekly = installmentKes(m.loan!.principalKesCents, m.loan!.feeBps, m.loan!.weeks);
                    const owed = m.arrearsKes > 0 ? m.arrearsKes : (nextDue(m)?.amountKesCents ?? 0) - (nextDue(m)?.paidKesCents ?? 0);
                    return (
                      <tr key={m.id}>
                        <td>
                          {m.name}
                          <input type="hidden" name="loanId" value={m.loan!.id} />
                          <div className="text-xs text-muted">{m.state === "late" ? `Behind ${kes(m.arrearsKes)}` : "Up to date"}</div>
                        </td>
                        <td className="r num">{kes(weekly)}</td>
                        <td className="r num">{kes(owed)}</td>
                        <td className="r">
                          <input
                            aria-label={`Paid by ${m.name}`}
                            name={`member:${m.loan!.id}`}
                            type="number"
                            min={0}
                            step={1}
                            defaultValue={Math.round(owed / 100)}
                            className="num w-28 rounded-md border border-line bg-bg px-2 py-1 text-right"
                          />
                        </td>
                        <td className="r">
                          <input
                            aria-label={`Circle covered for ${m.name}`}
                            name={`circle:${m.loan!.id}`}
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            className="num w-28 rounded-md border border-line bg-bg px-2 py-1 text-right"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ActionForm>
          <Note>Principal repaid goes straight back to lenders, pro rata, at today’s exchange rate.</Note>
        </Panel>
      )}

      <Panel>
        <h2 className="text-lg font-semibold">Members</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Member</th>
                <th>Loan</th>
                <th className="r">Paid</th>
                <th className="r">Circle covered</th>
                <th className="r">Arrears</th>
                <th>Next due</th>
              </tr>
            </thead>
            <tbody>
              {s.members.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.name}
                    <div className="text-xs text-muted">{m.business}</div>
                  </td>
                  <td className="text-sm">{m.loan ? `${kes(m.loan.principalKesCents)} · ${m.loan.status.toLowerCase()}` : "Not listed"}</td>
                  <td className="r num">{kes(m.paidKes)}</td>
                  <td className="r num">{kes(m.coveredKes)}</td>
                  <td className={`r num ${m.arrearsKes > 0 ? "text-bad" : ""}`}>{kes(m.arrearsKes)}</td>
                  <td className="text-sm">{nextDue(m) ? `#${nextDue(m)!.n} · ${date(nextDue(m)!.dueOn)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {repaying.length > 0 && (
        <Panel>
          <h2 className="text-lg font-semibold">Close a loan that won’t be repaid</h2>
          <p className="text-sm text-muted">
            Use only after the circle and a reschedule have been tried. Unpaid principal is covered by the reserve first; anything beyond it is a
            lender loss. No public shaming, no contacting phone contacts, no home visits.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {repaying.map((m) => (
              <div key={m.id} className="rounded-lg border border-line p-3">
                <div className="mb-2 font-semibold">
                  {m.name} <span className="text-sm font-normal text-muted">· {kes(m.arrearsKes)} behind</span>
                </div>
                <ActionForm
                  action={closeDefault.bind(null, m.loan!.id)}
                  label="Close as defaulted"
                  variant="danger"
                  confirm={`Close ${m.name}'s loan as defaulted? This can't be undone.`}
                >
                  <label className="field">
                    <span>Closed on</span>
                    <input type="date" name="on" defaultValue={todayIso()} required />
                  </label>
                  <label className="field">
                    <span>Why</span>
                    <input name="note" required placeholder="e.g. Member moved away; reschedule did not work" />
                  </label>
                </ActionForm>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {c.shares.length > 0 && (
        <Note>
          {c.shares.length} lender shares · {usd(c.shares.reduce((t, x) => t + x.repaidCents, 0))} repaid to lenders ·{" "}
          {usd(c.shares.reduce((t, x) => t + x.lostCents, 0))} lost
        </Note>
      )}
    </div>
  );
}
