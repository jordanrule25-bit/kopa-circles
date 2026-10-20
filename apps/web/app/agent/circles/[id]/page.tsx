import { installmentKes, type LimitDecision } from "@kopa/core";
import { prisma } from "@kopa/db";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    include: {
      members: { orderBy: { id: "asc" }, include: { scoreInputs: true, loans: true } },
    },
  });
  if (!circle) notFound();

  const fx = currentFx();
  const forming = circle.status === "FORMING";
  const rows = circle.members.map((m) => {
    const input = [...m.scoreInputs].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())[0];
    const loan = m.loans[0];
    // Once listed, show the loan that was actually listed rather than recomputing.
    const decision: LimitDecision | null = forming ? limitFor(circle.cycle, m.scoreInputs, fx) : null;
    return { m, input, loan, decision };
  });

  const qualifying = forming
    ? rows.flatMap((r) => (r.decision?.status === "APPROVED" ? [r.decision] : []))
    : [];
  const listedLoans = rows.flatMap((r) => (r.loan ? [r.loan] : []));
  const totalKes = forming
    ? qualifying.reduce((t, d) => t + d.amountKesCents, 0)
    : listedLoans.reduce((t, l) => t + l.principalKesCents, 0);
  const weeklyKes = forming
    ? qualifying.reduce((t, d) => t + d.installmentKesCents, 0)
    : listedLoans.reduce((t, l) => t + installmentKes(l.principalKesCents, l.feeBps, l.weeks), 0);
  const full = circle.members.length === CIRCLE_SIZE;
  const canSubmit = forming && full && qualifying.length >= MIN_QUALIFYING;

  return (
    <main>
      <Link href="/agent" className="mt-6 inline-block text-sm text-stone-500 hover:underline">
        ← Your circles
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{circle.name}</h1>
          <p className="text-sm text-stone-500">
            {circle.town} · {circle.sector} · loan {circle.cycle}
          </p>
        </div>
        <span data-testid="circle-status" className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
          {STATUS_LABEL[circle.status]}
        </span>
      </div>
      <p className="mt-3 text-stone-700">{circle.story}</p>

      <section className="mt-6">
        <h2 className="font-semibold">
          Members <span className="font-normal text-stone-500">({circle.members.length} of {CIRCLE_SIZE})</span>
        </h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No members yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Member</th>
                  <th className="px-3 py-2 text-right font-medium">Weekly inflow</th>
                  <th className="px-3 py-2 text-right font-medium">Bureau loans</th>
                  <th className="px-3 py-2 font-medium">{forming ? "Limit" : "Listed loan"}</th>
                  {forming && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map(({ m, input, loan, decision }) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2">
                      {m.name}
                      <span className="block text-xs text-stone-500">{m.business}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{input?.weeklyInflowKesCents != null ? kes(input.weeklyInflowKesCents) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{input?.activeLoans ?? "—"}</td>
                    <td className="px-3 py-2">
                      {forming ? (
                        decision?.status === "APPROVED" ? (
                          <>
                            <span className="tabular-nums">
                              {usd(decision.amountUsdCents)} · {kes(decision.amountKesCents)}
                            </span>
                            <span className="block text-xs text-stone-500">
                              {kes(decision.installmentKesCents)} a week ·{" "}
                              {decision.limitedBy === "CYCLE_CAP" ? "cycle cap" : "limited by inflow"}
                            </span>
                          </>
                        ) : decision?.status === "DECLINED" ? (
                          <span className="text-red-800">Declined: {DECLINE_LABEL[decision.reason]}</span>
                        ) : (
                          "—"
                        )
                      ) : loan ? (
                        <>
                          <span className="tabular-nums">{kes(loan.principalKesCents)}</span>
                          <span className="block text-xs text-stone-500">
                            {kes(installmentKes(loan.principalKesCents, loan.feeBps, loan.weeks))} a week
                          </span>
                        </>
                      ) : (
                        <span className="text-stone-500">Not listed (did not qualify)</span>
                      )}
                    </td>
                    {forming && (
                      <td className="px-3 py-2 text-right">
                        <form action={removeMember.bind(null, circle.id, m.id)}>
                          <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Remove</button>
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
        <section className="mt-6 space-y-3 rounded border border-stone-200 bg-white p-4">
          {forming ? (
            <p data-testid="verdict" className={qualifying.length >= MIN_QUALIFYING ? "text-emerald-800" : "text-red-800"}>
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
          <p className="text-xs text-stone-500">
            Limits use KSh {fx.kesPerUsd} per US dollar. Flat 7% fee, 26 weekly payments.
          </p>
        </section>
      )}
    </main>
  );
}
