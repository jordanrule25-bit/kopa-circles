import Link from "next/link";
import { CircleCover } from "@/components/circle-cover";
import { Chip, Empty, Panel, Progress, Stat, Stats } from "@/components/ui";
import { adminOverview, type MeetingStatus } from "@/lib/admin";
import { kes, pct } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Today" };

const day = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const MEETING: Record<MeetingStatus, { label: string; tone: "good" | "sun" | "bad" | "neutral" }> = {
  recorded: { label: "Recorded", tone: "good" },
  partial: { label: "Partly paid", tone: "sun" },
  "to-record": { label: "To record", tone: "bad" },
  upcoming: { label: "Upcoming", tone: "neutral" },
};

function Attention({ href, count, label, sub, urgent }: { href: string; count: number; label: string; sub: string; urgent?: boolean }) {
  return (
    <Link href={href} className="group grid gap-1 rounded-card bg-surface p-5 shadow-card transition-transform hover:-translate-y-0.5">
      <span className={`num text-4xl font-semibold tracking-tight ${count > 0 && urgent ? "text-bad" : count > 0 ? "text-accent" : "text-muted"}`}>{count}</span>
      <span className="font-medium">{label}</span>
      <span className="text-sm text-muted">
        {sub} <span className="text-accent opacity-0 transition-opacity group-hover:opacity-100">›</span>
      </span>
    </Link>
  );
}

export default async function AdminToday() {
  const admin = await requireAdmin();
  const today = new Date();
  const o = await adminOverview(today);
  const toRecord = o.meetings.filter((m) => m.status === "to-record" || m.status === "partial");
  const arrearsKes = o.behind.reduce((t, b) => t + b.arrearsKes, 0);
  // Operations run on Kenya time.
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Nairobi" }).format(today));
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <>
      <div>
        <p className="text-muted">{today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Nairobi" })}</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Good {greeting}
          {admin.name ? `, ${admin.name.split(" ")[0]}` : ""}</h1>
      </div>

      <section className="grid gap-4" aria-label="Needs attention">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Attention href="/admin/listings" count={o.submittedCount} label="To approve" sub="Circles agents submitted" />
          <Attention href="/admin/listings" count={o.readyToDisburse.length} label="Ready to disburse" sub={`Fully funded, of ${o.raisingCount} raising`} />
          <Attention href="#meetings" count={toRecord.length} label="Meetings to record" sub="Due this week, not fully paid" urgent />
          <Attention href="#behind" count={o.behind.length} label="Members behind" sub={arrearsKes ? `${kes(arrearsKes)} in arrears` : "Everyone is up to date"} urgent />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="grid gap-6">
          <Panel id="meetings">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold">This week’s meetings</h2>
              <span className="text-sm text-muted">
                {day(o.week.start)} – {day(new Date(o.week.end.getTime() - 86_400_000))}
              </span>
            </div>
            {o.meetings.length === 0 ? (
              <p className="text-muted">No payments are due this week.</p>
            ) : (
              <ul className="grid">
                {o.meetings.map((m) => {
                  const st = MEETING[m.status];
                  return (
                    <li key={m.circle.id} className="border-b border-line last:border-0">
                      <Link href={`/admin/circles/${m.circle.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                        <div className="w-14 flex-none text-center">
                          <div className="text-xs font-medium uppercase text-muted">{day(m.on).split(" ")[0]}</div>
                          <div className="num text-xl font-semibold">{m.on.getUTCDate()}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{m.circle.name}</div>
                          <div className="text-sm text-muted">
                            {m.circle.town} · {kes(m.paidKes)} of {kes(m.dueKes)}
                          </div>
                        </div>
                        <Chip tone={st.tone}>{st.label}</Chip>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel id="behind">
            <h2 className="text-xl font-semibold">Who’s behind</h2>
            {o.behind.length === 0 ? (
              <p className="text-muted">Nobody is behind on payments.</p>
            ) : (
              <ul className="grid">
                {o.behind.map((b) => (
                  <li key={b.member.id} className="border-b border-line last:border-0">
                    <Link href={`/admin/circles/${b.circle.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{b.member.name}</div>
                        <div className="text-sm text-muted">
                          {b.circle.name} · {b.member.business}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="num font-semibold text-bad">{kes(b.arrearsKes)}</div>
                        <div className="text-xs text-muted">
                          {b.daysLate} {b.daysLate === 1 ? "day" : "days"} late
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted">Talk to the circle first. No public shaming, no contacting phone contacts, no home visits. One free reschedule per loan.</p>
          </Panel>

          {o.pastTerm.length > 0 && (
            <Panel>
              <h2 className="text-xl font-semibold">Past their last due date</h2>
              <p className="text-sm text-muted">These loans’ final payment date has passed with money still owed. Decide whether to keep collecting or close them.</p>
              <ul className="grid gap-2">
                {o.pastTerm.map((p) => (
                  <li key={p.loan.id} className="flex items-center justify-between gap-3">
                    <span>
                      {p.member.name} <span className="text-muted">· {p.circle.name}</span>
                    </span>
                    <Link href={`/admin/circles/${p.circle.id}`} className="text-sm font-medium text-accent hover:underline">
                      Review ›
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <aside className="grid gap-6">
          <Stats>
            <Stat label="On-time rate" value={pct(o.stats.onTimeRate)} sub={`${o.stats.coveredByCircle} covered by circles`} />
            <Stat label="30+ days late" value={pct(o.stats.par30)} sub="Share of outstanding" />
          </Stats>
          <Panel>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Reserve</h2>
              <Link href="/admin/reserve" className="text-sm font-medium text-accent hover:underline">
                History ›
              </Link>
            </div>
            <div>
              <div className="num text-3xl font-semibold tracking-tight">{kes(o.stats.reserveKes)}</div>
              <div className="text-sm text-muted">
                {o.reserveCoverage >= 1
                  ? `enough to cover all ${kes(o.stats.outstandingKes)} of outstanding principal`
                  : `covers ${pct(o.reserveCoverage)} of ${kes(o.stats.outstandingKes)} outstanding principal`}
              </div>
            </div>
            <Progress value={o.reserveCoverage} label="Reserve coverage" />
          </Panel>
          {o.readyToDisburse.length > 0 && (
            <Panel>
              <h2 className="text-xl font-semibold">Ready to disburse</h2>
              {o.readyToDisburse.map((c) => (
                <Link key={c.id} href="/admin/listings" className="grid gap-2 hover:opacity-80">
                  <CircleCover id={c.id} names={c.members.filter((m) => m.loans.length).map((m) => m.name)} size="sm" />
                  <span className="font-medium">{c.name}</span>
                </Link>
              ))}
            </Panel>
          )}
          {o.meetings.length === 0 && o.behind.length === 0 && o.submittedCount === 0 && <Empty title="All clear">Nothing needs you right now.</Empty>}
        </aside>
      </div>
    </>
  );
}
