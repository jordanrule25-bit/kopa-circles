import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Chip, Empty, Note, PageHead, Panel, Progress } from "@/components/ui";
import { loadCircles, summarize } from "@/lib/circles";
import { todayIso } from "@/lib/dates";
import { kes, usd0 } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { approve, disburse } from "../actions";

export const metadata = { title: "Listings" };

export default async function AdminListings() {
  await requireAdmin();
  const [submitted, raising] = await Promise.all([loadCircles({ status: "SUBMITTED" }), loadCircles({ status: "RAISING" })]);
  const today = new Date();

  return (
    <>
      <PageHead title="Listings" sub="Approve circles agents have submitted, then disburse once they're funded." />

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">
          Waiting for approval <span className="font-body font-normal text-muted">({submitted.length})</span>
        </h2>
        {submitted.length === 0 ? (
          <Empty title="Nothing to review" />
        ) : (
          submitted.map((c) => {
            const s = summarize(c, today);
            return (
              <Panel key={c.id} data-testid={`review-${c.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <p className="text-sm text-muted">
                      {c.town} · {c.sector} · loan {c.cycle} · agent {c.agent.town} · {c.agent.partner.name}
                    </p>
                  </div>
                  <Chip>
                    {usd0(s.targetCents)} · {kes(s.principalKes)}
                  </Chip>
                </div>
                <p className="text-sm">{c.story}</p>
                <div className="overflow-x-auto">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th className="r">Loan</th>
                        <th>Consent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.members.map((m) => (
                        <tr key={m.id}>
                          <td>
                            {m.name} <span className="text-xs text-muted">· {m.business}</span>
                          </td>
                          <td className="r num">{m.loan ? `${usd0(m.loan.listedUsdCents)} · ${kes(m.loan.principalKesCents)}` : "Not listed"}</td>
                          <td className="text-sm">{m.consentAt ? m.consentAt.toISOString().slice(0, 10) : "Missing"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ActionForm action={approve.bind(null, c.id)} label="Approve listing" pendingLabel="Approving…" />
              </Panel>
            );
          })
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">
          Raising <span className="font-body font-normal text-muted">({raising.length})</span>
        </h2>
        {raising.length === 0 ? (
          <Empty title="No circles raising" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {raising.map((c) => {
              const s = summarize(c, today);
              const full = s.fundedCents >= s.targetCents;
              return (
                <Panel key={c.id} data-testid={`raising-${c.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/circles/${c.id}`} className="text-lg font-semibold hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-sm text-muted">
                        {c.town} · {s.members.filter((m) => m.loan).length} loans · {kes(s.principalKes)}
                      </p>
                    </div>
                    <Chip tone={full ? "good" : "sun"}>{full ? "Fully funded" : `${usd0(s.targetCents - s.fundedCents)} to go`}</Chip>
                  </div>
                  <Progress value={s.targetCents ? s.fundedCents / s.targetCents : 0} tone={full ? "good" : "sun"} />
                  <ActionForm action={disburse.bind(null, c.id)} label="Mark disbursed" pendingLabel="Disbursing…">
                    <label className="field">
                      <span>Disbursed on</span>
                      <input type="date" name="on" defaultValue={todayIso()} required />
                    </label>
                    {!full && (
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" name="allowUnfunded" className="mt-1" />
                        The rest is funded outside the platform (pilot). Lenders get back only their funded share.
                      </label>
                    )}
                  </ActionForm>
                  <Note>Pilot: the partner sends M-Pesa by hand; this records it. Payment rail: mock.</Note>
                </Panel>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
