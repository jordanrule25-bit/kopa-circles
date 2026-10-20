import Link from "next/link";
import { lendToCircle } from "@/app/lend-actions";
import { type CircleFull, type CircleSummary, statusChip } from "@/lib/circles";
import { ordinal, pct, usd0 } from "@/lib/format";
import { CircleCover } from "./circle-cover";
import { LendForm } from "./lend-form";
import { GrowthStage } from "./plants";
import { Card, Chip, Dots, Progress, Score } from "./ui";

export function CircleCard({ c, s, mineCents, balanceCents }: { c: CircleFull; s: CircleSummary; mineCents: number; balanceCents: number | null }) {
  const st = statusChip(c, s);
  return (
    <Card>
      <Link href={`/circles/${c.id}`} tabIndex={-1} aria-hidden="true">
        <CircleCover id={c.id} names={s.members.filter((m) => m.loan).map((m) => m.name)} size="sm" />
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">
            <Link href={`/circles/${c.id}`} className="hover:underline">
              {c.name}
            </Link>
          </h3>
          <div className="text-sm text-muted">
            {c.town}, Kenya · {c.sector}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GrowthStage status={c.status} />
          <Score score={c.score} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip tone={st.tone}>{st.label}</Chip>
        <Chip>Loan {ordinal(c.cycle)}</Chip>
        {mineCents > 0 && <Chip tone="good">You: {usd0(mineCents)}</Chip>}
      </div>
      <p className="text-[0.95rem] leading-relaxed text-muted">{c.story}</p>
      <div className="flex items-center justify-between gap-2 text-sm">
        <Dots states={s.members.filter((m) => m.loan).map((m) => m.state)} />
        <Link href={`/circles/${c.id}`} className="font-medium text-accent hover:underline">
          Members ›
        </Link>
      </div>
      {c.status === "RAISING" ? (
        <>
          <div className="flex justify-between gap-2 text-sm">
            <span>
              <span className="num">{usd0(s.fundedCents)}</span> of <span className="num">{usd0(s.targetCents)}</span>
            </span>
            <span className="num text-muted">{usd0(Math.max(0, s.targetCents - s.fundedCents))} to go</span>
          </div>
          <Progress value={s.targetCents ? s.fundedCents / s.targetCents : 0} tone="sun" label="Funded" />
          {balanceCents !== null && (
            <LendForm compact action={lendToCircle.bind(null, c.id)} remainingCents={Math.max(0, s.targetCents - s.fundedCents)} balanceCents={balanceCents} circleName={c.name} />
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between gap-2 text-sm">
            <span>
              Repaid <span className="num">{pct(s.totalDueKes ? Math.min(1, s.paidKes / s.totalDueKes) : 0)}</span>
            </span>
            <span className="num text-muted">week {s.week} of 26</span>
          </div>
          <Progress value={s.totalDueKes ? s.paidKes / s.totalDueKes : 0} label="Repaid" />
        </>
      )}
    </Card>
  );
}
