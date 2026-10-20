import { prisma } from "@kopa/db";
import Link from "next/link";
import type { ReactNode } from "react";
import { switchDevUser } from "@/app/dev-user";
import { usd } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { NavTabs } from "./nav-tabs";

const TABS: Record<string, Array<{ href: string; label: string }>> = {
  LENDER: [
    { href: "/", label: "Lend" },
    { href: "/portfolio", label: "My portfolio" },
    { href: "/platform", label: "Platform" },
  ],
  AGENT: [
    { href: "/agent", label: "My circles" },
    { href: "/", label: "Lend" },
  ],
  ADMIN: [
    { href: "/admin", label: "Listings" },
    { href: "/admin/repaying", label: "Repaying" },
    { href: "/admin/reserve", label: "Reserve" },
    { href: "/platform", label: "Platform" },
    { href: "/", label: "Lend" },
  ],
};

function Ring() {
  return (
    <svg className="h-[26px] w-[26px] flex-none" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="10" fill="none" stroke="var(--accent)" strokeWidth="3" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={13 + 10 * Math.cos((a * Math.PI) / 180)} cy={13 + 10 * Math.sin((a * Math.PI) / 180)} r="2.6" fill="var(--sun)" />
      ))}
    </svg>
  );
}

export async function Shell({ children }: { children: ReactNode }) {
  const [user, users] = await Promise.all([
    currentUser(),
    prisma.user.findMany({ where: { role: { in: ["LENDER", "AGENT", "ADMIN"] } }, orderBy: [{ role: "asc" }, { id: "asc" }], include: { agent: true } }),
  ]);
  const role = user?.role ?? "LENDER";
  const tabs = TABS[role] ?? TABS.LENDER!;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Ring />
            <span className="font-display text-[1.35rem] font-semibold tracking-tight">Kopa Circles</span>
          </Link>
          <span className="rounded-full border border-line bg-sun-soft px-2 py-0.5 text-xs font-semibold">Pilot</span>
          <div className="ml-auto flex items-center gap-3">
            {user?.lender && (
              <span className="flex items-baseline gap-2 text-sm">
                <span className="text-muted">Balance</span>
                <span className="num text-[1.1rem] font-medium" data-testid="balance">
                  {usd(user.lender.balanceCents)}
                </span>
              </span>
            )}
            <form action={switchDevUser} className="flex items-center gap-1.5 text-sm">
              <label htmlFor="dev-user" className="sr-only">
                Dev login
              </label>
              <select id="dev-user" name="user" defaultValue={user ? `${user.id}|${user.role}` : ""} className="rounded-md border border-line bg-bg px-2 py-1 text-sm">
                {users.map((u) => (
                  <option key={u.id} value={`${u.id}|${u.role}`}>
                    {u.name ?? u.email ?? u.id} · {u.role.toLowerCase()}
                    {u.agent ? `, ${u.agent.town}` : ""}
                  </option>
                ))}
              </select>
              <button className="rounded-md border border-line bg-surface px-2 py-1 text-sm font-semibold hover:border-accent">Switch</button>
            </form>
          </div>
          <NavTabs tabs={tabs} />
        </div>
      </header>
      <main className="mx-auto grid max-w-[1180px] gap-5 px-4 pb-12 pt-5">{children}</main>
    </>
  );
}
