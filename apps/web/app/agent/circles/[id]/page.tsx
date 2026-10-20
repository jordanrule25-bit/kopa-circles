import { installmentKes, type LimitDecision } from "@kopa/core";
import { prisma } from "@kopa/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionBar, MemberSlots, Steps } from "@/components/agent-ui";
import { GrowthStage, Leaf } from "@/components/plants";
import { Alert, Back, Chip, Note } from "@/components/ui";
import { CIRCLE_SIZE, MIN_QUALIFYING } from "@/lib/circle-rules";
import { DECLINE_LABEL, kes, STATUS_LABEL, usd } from "@/lib/format";
import { currentFx } from "@/lib/fx";
import { limitFor } from "@/lib/limits";
import { requireAgent } from "@/lib/session";
import { removeMember, submitForListing } from "../../actions";
import { SubmitListing } from "./submit-listing";

export default async function CirclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const [{ id }, { added }] = await Promise.all([params, searchParams]);
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
    const decision: LimitDecision | null = forming ? limitFor(circle.cycle, m.scoreInputs, fx) : null;
    return { m, input, loan: m.loans[0], decision };
  });

  const qualifying = forming ? rows.flatMap((r) => (r.decision?.status === "APPROVED" ? [r.decision] : [])) : [];
  const listedLoans = rows.flatMap((r) => (r.loan ? [r.loan] : []));
  const totalKes = forming ? qualifying.reduce((t, d) => t + d.amountKesCents, 0) : listedLoans.reduce((t, l) => t + l.principalKesCents, 0);
  const weeklyKes = forming
    ? qualifying.reduce((t, d) => t + d.installmentKesCents, 0)
    : listedLoans.reduce((t, l) => t + installmentKes(l.principalKesCents, l.feeBps, l.weeks), 0);
  const full = circle.members.length === CIRCLE_SIZE;
  const enough = qualifying.length >= MIN_QUALIFYING;
  const justAdded = rows.find((r) => r.m.id === added);
  const step = forming ? (full ? 2 : 1) : 3;

  return (
    <div className="agent mx-auto grid w-full max-w-xl gap-6">
      <div className="grid gap-4">
        <Back href="/agent">My circles</Back>
        <Steps current={step} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{circle.name}</h1>
            <p className="text-muted">
              {circle.town} · {circle.sector} · loan {circle.cycle}
            </p>
          </div>
          <div className="flex flex-none items-center gap-2">
            <GrowthStage status={circle.status} size={30} />
            <Chip tone={forming ? "neutral" : "good"} data-testid="circle-status">
              {STATUS_LABEL[circle.status]}
            </Chip>
          </div>
        </div>
      </div>

      {justAdded && forming && (
        <Alert tone="good">
          {justAdded.m.name} added.{" "}
          {justAdded.decision?.status === "APPROVED"
            ? `Can borrow up to ${usd(justAdded.decision.amountUsdCents)}.`
            : justAdded.decision?.status === "DECLINED"
              ? "Won't qualify for a loan this cycle."
              : ""}
        </Alert>
      )}

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Members</h2>
          <MemberSlots filled={circle.members.length} />
        </div>

        <ul className="grid gap-3">
          {rows.map(({ m, input, loan, decision }) => {
            const declined = forming ? decision?.status === "DECLINED" : !loan;
            return (
              <li key={m.id} aria-label={m.name} className="flex gap-4 rounded-card bg-surface p-4 shadow-card">
                <span className={declined ? "rotate-[100deg]" : ""}>
                  <Leaf size={28} color={declined ? "var(--bad)" : "var(--accent)"} />
                </span>
                <div className="grid min-w-0 flex-1 gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{m.name}</span>
                    {forming && (
                      <form action={removeMember.bind(null, circle.id, m.id)}>
                        <button className="px-1 py-1 text-sm text-muted hover:text-bad" aria-label={`Remove ${m.name}`}>
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                  <span className="text-sm text-muted">
                    {m.business} · <span className="num">{input?.weeklyInflowKesCents != null ? kes(input.weeklyInflowKesCents) : "—"}</span> a week ·{" "}
                    {input?.activeLoans ?? 0} bureau loans
                  </span>
                  {forming ? (
                    decision?.status === "APPROVED" ? (
                      <span>
                        <span className="num font-semibold">
                          {usd(decision.amountUsdCents)} · {kes(decision.amountKesCents)}
                        </span>{" "}
                        <span className="text-sm text-muted">
                          {kes(decision.installmentKesCents)}/week · {decision.limitedBy === "CYCLE_CAP" ? "cycle cap" : "limited by inflow"}
                        </span>
                      </span>
                    ) : decision?.status === "DECLINED" ? (
                      <span className="text-sm text-bad">Declined: {DECLINE_LABEL[decision.reason]}</span>
                    ) : null
                  ) : loan ? (
                    <span>
                      <span className="num font-semibold">{kes(loan.principalKesCents)}</span>{" "}
                      <span className="text-sm text-muted">{kes(installmentKes(loan.principalKesCents, loan.feeBps, loan.weeks))}/week</span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted">Not listed (did not qualify)</span>
                  )}
                </div>
              </li>
            );
          })}
          {forming &&
            Array.from({ length: CIRCLE_SIZE - circle.members.length }, (_, i) => (
              <li key={`empty-${i}`} className="rounded-card border-2 border-dashed border-line p-4 text-center text-muted">
                Member {circle.members.length + i + 1}
              </li>
            ))}
        </ul>
      </section>

      {(full || !forming) && (
        <section className="grid gap-2 rounded-card bg-surface p-5 shadow-card">
          {forming ? (
            <p data-testid="verdict" className={enough ? "text-accent" : "text-bad"}>
              {enough
                ? `${qualifying.length} of ${CIRCLE_SIZE} members qualify for ${kes(totalKes)} in total. The circle will pay ${kes(weeklyKes)} a week.`
                : `Only ${qualifying.length} of ${CIRCLE_SIZE} members qualify. A circle needs at least ${MIN_QUALIFYING}; remove the declined members and add others.`}
            </p>
          ) : (
            <p>
              {listedLoans.length} loans listed for {kes(totalKes)} in total; the circle pays {kes(weeklyKes)} a week.
              {circle.status === "SUBMITTED" && " An admin will review the listing before lenders can see it."}
            </p>
          )}
          <Note>Limits use KSh {fx.kesPerUsd} per US dollar. Flat 7% fee, 26 weekly payments.</Note>
        </section>
      )}

      {forming && (
        <ActionBar>
          {full ? (
            <SubmitListing action={submitForListing.bind(null, circle.id)} disabled={!enough} />
          ) : (
            <Link
              href={`/agent/circles/${circle.id}/members/new`}
              className="flex w-full items-center justify-center rounded-full bg-accent py-3.5 text-[17px] font-medium text-accent-ink hover:brightness-110"
            >
              Add member {circle.members.length + 1} of {CIRCLE_SIZE}
            </Link>
          )}
        </ActionBar>
      )}
    </div>
  );
}
