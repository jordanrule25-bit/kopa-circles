import { installmentKes, type LimitDecision } from "@kopa/core";
import { prisma } from "@kopa/db";
import { notFound } from "next/navigation";
import { Back, Chip, Note, PageHead, Panel } from "@/components/ui";
import { CIRCLE_SIZE, MIN_QUALIFYING } from "@/lib/circle-rules";
import { DECLINE_LABEL, kes, STATUS_LABEL, usd } from "@/lib/format";
import { currentFx } from "@/lib/fx";
import { limitFor } from "@/lib/limits";
import { requireAgent } from "@/lib/session";
import { addMember, removeMember, submitForListing } from "../../actions";
import { MemberForm } from "./member-form";
import { SubmitListing } from "./submit-listing";

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await requireAgent();
  const circle = await prisma.circle.findFirst({
    where: { id, agentId: agent.userId },
    include: { members: { orderBy: { id: "asc" }, include: { scoreInputs: true, loans: true } } },
  });
  if (!circle) notFound();

  const fx = currentFx();
  const forming = circle.status === "FORMING";
  const rows = circle.members.map((m) => {
    const input = [...m.scoreInputs].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())[0];
    const loan = m.loans[0];
    const decision: LimitDecision | null = forming ? limitFor(circle.cycle, m.scoreInputs, fx) : null;
    return { m, input, loan, decision };
  });

  const qualifying = forming ? rows.flatMap((r) => (r.decision?.status === "APPROVED" ? [r.decision] : [])) : [];
  const listedLoans = rows.flatMap((r) => (r.loan ? [r.loan] : []));
  const totalKes = forming ? qualifying.reduce((t, d) => t + d.amountKesCents, 0) : listedLoans.reduce((t, l) => t + l.principalKesCents, 0);
  const weeklyKes = forming
    ? qualifying.reduce((t, d) => t + d.installmentKesCents, 0)
    : listedLoans.reduce((t, l) => t + installmentKes(l.principalKesCents, l.feeBps, l.weeks), 0);
  const full = circle.members.length === CIRCLE_SIZE;
  const canSubmit = forming && full && qualifying.length >= MIN_QUALIFYING;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <div>
        <Back href="/agent">My circles</Back>
        <PageHead
          title={circle.name}
          sub={`${circle.town} · ${circle.sector} · loan ${circle.cycle}`}
          action={
            <Chip tone={forming ? "neutral" : "good"} data-testid="circle-status" className="text-sm">
              {STATUS_LABEL[circle.status]}
            </Chip>
          }
        />
        <p className="mt-3">{circle.story}</p>
      </div>

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">
          Members <span className="font-body font-normal text-muted">({circle.members.length} of {CIRCLE_SIZE})</span>
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No members yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="data">
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="r">Weekly inflow</th>
                  <th className="r">Bureau loans</th>
                  <th>{forming ? "Limit" : "Listed loan"}</th>
                  {forming && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ m, input, loan, decision }) => (
                  <tr key={m.id}>
                    <td>
                      {m.name}
                      <span className="block text-xs text-muted">{m.business}</span>
                    </td>
                    <td className="r num">{input?.weeklyInflowKesCents != null ? kes(input.weeklyInflowKesCents) : "—"}</td>
                    <td className="r num">{input?.activeLoans ?? "—"}</td>
                    <td>
                      {forming ? (
                        decision?.status === "APPROVED" ? (
                          <>
                            <span className="num">
                              {usd(decision.amountUsdCents)} · {kes(decision.amountKesCents)}
                            </span>
                            <span className="block text-xs text-muted">
                              {kes(decision.installmentKesCents)} a week · {decision.limitedBy === "CYCLE_CAP" ? "cycle cap" : "limited by inflow"}
                            </span>
                          </>
                        ) : decision?.status === "DECLINED" ? (
                          <span className="text-bad">Declined: {DECLINE_LABEL[decision.reason]}</span>
                        ) : (
                          "—"
                        )
                      ) : loan ? (
                        <>
                          <span className="num">{kes(loan.principalKesCents)}</span>
                          <span className="block text-xs text-muted">{kes(installmentKes(loan.principalKesCents, loan.feeBps, loan.weeks))} a week</span>
                        </>
                      ) : (
                        <span className="text-muted">Not listed (did not qualify)</span>
                      )}
                    </td>
                    {forming && (
                      <td className="r">
                        <form action={removeMember.bind(null, circle.id, m.id)}>
                          <button className="text-xs text-muted hover:text-bad hover:underline">Remove</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {forming && !full && <MemberForm action={addMember.bind(null, circle.id)} remaining={CIRCLE_SIZE - circle.members.length} />}

      {(full || !forming) && (
        <Panel>
          {forming ? (
            <p data-testid="verdict" className={`rounded-lg px-3 py-2 text-sm ${qualifying.length >= MIN_QUALIFYING ? "bg-accent-soft" : "bg-bad-soft"}`}>
              {qualifying.length >= MIN_QUALIFYING
                ? `${qualifying.length} of ${CIRCLE_SIZE} members qualify for ${kes(totalKes)} in total. The circle will pay ${kes(weeklyKes)} a week.`
                : `Only ${qualifying.length} of ${CIRCLE_SIZE} members qualify. A circle needs at least ${MIN_QUALIFYING}; remove the declined members and add others.`}
            </p>
          ) : (
            <p>
              {listedLoans.length} loans listed for {kes(totalKes)} in total; the circle pays {kes(weeklyKes)} a week.
              {circle.status === "SUBMITTED" && " An admin will review the listing before lenders can see it."}
            </p>
          )}
          {forming && <SubmitListing action={submitForListing.bind(null, circle.id)} disabled={!canSubmit} />}
          <Note>Limits use KSh {fx.kesPerUsd} per US dollar. Flat 7% fee, 26 weekly payments.</Note>
        </Panel>
      )}
    </div>
  );
}
