import { aprFromFlatFee, installmentKes } from "@kopa/core";
import { notFound } from "next/navigation";
import { lendToCircle } from "@/app/lend-actions";
import { LendForm } from "@/components/lend-form";
import { Back, Chip, Note, PageHead, Panel, Progress, Score, Stat, Stats } from "@/components/ui";
import { loadCircle, statusChip, summarize } from "@/lib/circles";
import { kes, ordinal, pct, usd, usd0 } from "@/lib/format";
import { currentFx } from "@/lib/fx";
import { currentUser } from "@/lib/session";

export default async function CirclePublic({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, user] = await Promise.all([loadCircle(id), currentUser()]);
  if (!c || !["RAISING", "REPAYING", "COMPLETE"].includes(c.status)) notFound();
  const s = summarize(c, new Date());
  const st = statusChip(c, s);
  const fx = currentFx();
  const mine = user?.lender ? c.shares.filter((x) => x.lenderId === user.id) : [];
  const mineCents = mine.reduce((t, x) => t + x.amountCents, 0);
  const remaining = Math.max(0, s.targetCents - s.fundedCents);

  return (
    <div className="grid gap-5">
      <div>
        <Back href="/">All circles</Back>
        <PageHead
          title={c.name}
          sub={`${c.town}, Kenya · ${c.sector} · ${ordinal(c.cycle)} loan`}
          action={
            <div className="flex items-center gap-2">
              <Chip tone={st.tone}>{st.label}</Chip>
              <Score score={c.score} />
            </div>
          }
        />
        <p className="mt-3 max-w-3xl">{c.story}</p>
      </div>

      <Stats>
        <Stat label="Raising" value={usd0(s.targetCents)} sub={`${kes(s.principalKes)} to ${s.members.filter((m) => m.loan).length} members`} />
        <Stat label="Funded" value={usd0(s.fundedCents)} sub={`${c.shares.length} loan shares`} />
        <Stat label="Repaid" value={pct(s.totalDueKes ? s.paidKes / s.totalDueKes : 0)} sub={s.disbursedAt ? `week ${s.week} of 26` : "Not disbursed yet"} />
        {mineCents > 0 && <Stat label="Your share" value={usd(mineCents)} sub={`${usd(mine.reduce((t, x) => t + x.repaidCents, 0))} repaid to you`} />}
      </Stats>

      {c.status === "RAISING" && (
        <Panel>
          <div className="flex justify-between text-sm">
            <span>
              <span className="num">{usd0(s.fundedCents)}</span> of <span className="num">{usd0(s.targetCents)}</span>
            </span>
            <span className="num text-muted">{usd0(remaining)} to go</span>
          </div>
          <Progress value={s.targetCents ? s.fundedCents / s.targetCents : 0} tone="sun" />
          {user?.lender ? (
            <LendForm action={lendToCircle.bind(null, c.id)} remainingCents={remaining} balanceCents={user.lender.balanceCents} circleName={c.name} />
          ) : (
            <Note>Switch to a lender account to lend.</Note>
          )}
        </Panel>
      )}

      <Panel>
        <h2 className="text-lg font-semibold">Members</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Member</th>
                <th className="r">Loan</th>
                <th className="r">Weekly</th>
                <th className="r">Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {s.members
                .filter((m) => m.loan)
                .map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.name.split(" ")[0]}
                      <div className="text-xs text-muted">{m.business}</div>
                    </td>
                    <td className="r num">
                      {kes(m.loan!.principalKesCents)}
                      <div className="text-xs text-muted">{usd0(m.loan!.listedUsdCents)}</div>
                    </td>
                    <td className="r num">{kes(installmentKes(m.loan!.principalKesCents, m.loan!.feeBps, m.loan!.weeks))}</td>
                    <td className="r num">{kes(m.paidKes)}</td>
                    <td>
                      {m.state === "pending"
                        ? "Waiting for funding"
                        : m.state === "late"
                          ? `Behind ${kes(m.arrearsKes)}`
                          : m.coveredKes > 0
                            ? `On time (circle covered ${kes(m.coveredKes)})`
                            : m.loan!.status === "CLOSED"
                              ? "Repaid in full"
                              : "On time"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Note>
          Flat 7% fee, 26 weekly payments at the circle meeting, about {pct(aprFromFlatFee(700, 26))} APR. Amounts at about KSh {fx.kesPerUsd} per
          dollar; lenders carry the exchange-rate risk. First names only. Members are fictional sample borrowers.
        </Note>
      </Panel>
    </div>
  );
}
