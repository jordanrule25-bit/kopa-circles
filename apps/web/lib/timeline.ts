import type { CircleFull } from "./circles";

export type TimelineItem = { at: Date; title: string; detail?: string; tone: "good" | "neutral" | "bad" | "sun" };

const DAY = 86_400_000;

/**
 * A circle's story for lenders, built only from stored facts: listing,
 * lender shares, disbursal, and each week's installments. Newest first.
 */
export function circleTimeline(c: CircleFull, today: Date): TimelineItem[] {
  const items: TimelineItem[] = [];
  const loans = c.members.flatMap((m) => m.loans.map((l) => ({ ...l, member: m })));
  const target = loans.reduce((t, l) => t + l.listedUsdCents, 0);

  items.push({ at: c.approvedAt ?? c.createdAt, title: "Listed", detail: `${loans.length} members asked for $${Math.round(target / 100)} in total`, tone: "neutral" });

  const shares = [...c.shares].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let funded = 0;
  let halfDone = false;
  for (const s of shares) {
    funded += s.amountCents;
    if (!halfDone && target > 0 && funded * 2 >= target && funded < target) {
      halfDone = true;
      items.push({ at: s.createdAt, title: "Halfway funded", tone: "sun" });
    }
    if (target > 0 && funded >= target) {
      items.push({ at: s.createdAt, title: "Fully funded", detail: `${new Set(shares.map((x) => x.lenderId)).size} lenders`, tone: "good" });
      break;
    }
  }

  const disbursedAt = loans.find((l) => l.disbursedAt)?.disbursedAt;
  if (disbursedAt) {
    items.push({ at: disbursedAt, title: "Money sent", detail: "Each member received their loan on M-Pesa", tone: "good" });

    const weeks = Math.max(0, ...loans.map((l) => l.installments.filter((i) => i.dueOn <= today).length));
    for (let n = 1; n <= weeks; n++) {
      const due = loans.map((l) => ({ l, i: l.installments.find((x) => x.n === n) })).filter((x) => x.i && x.i.dueOn <= today);
      if (due.length === 0) continue;
      const paid = due.filter((x) => x.i!.paidKesCents >= x.i!.amountKesCents);
      const covered = paid.filter((x) => x.i!.coveredByCircleKesCents > 0);
      const behind = due.length - paid.length;
      const at = new Date(due[0]!.i!.dueOn.getTime() + DAY / 2);
      const title = `Week ${n}`;
      if (behind === 0 && covered.length === 0) items.push({ at, title, detail: `All ${due.length} paid`, tone: "good" });
      else if (behind === 0) items.push({ at, title, detail: `All ${due.length} paid, the circle helped ${covered.length === 1 ? "one member" : `${covered.length} members`}`, tone: "good" });
      else items.push({ at, title, detail: `${paid.length} of ${due.length} paid, ${behind} catching up`, tone: "bad" });
    }
  }

  const closed = loans.filter((l) => l.closedAt);
  if (c.status === "COMPLETE" && closed.length) {
    const at = new Date(Math.max(...closed.map((l) => l.closedAt!.getTime())));
    const defaulted = loans.filter((l) => l.status === "DEFAULTED").length;
    items.push({
      at,
      title: defaulted ? "Loan cycle closed" : "Repaid in full",
      detail: defaulted ? `${defaulted} loan${defaulted > 1 ? "s" : ""} closed unpaid; the reserve covered what it could` : "Members can borrow about 30% more next cycle",
      tone: defaulted ? "bad" : "good",
    });
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}
