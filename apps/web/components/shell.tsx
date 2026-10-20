import { prisma } from "@kopa/db";
import Link from "next/link";
import type { ReactNode } from "react";
import { switchDevUser } from "@/app/dev-user";
import { usd } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { NavTabs } from "./nav-tabs";
import { Leaf } from "./plants";

const TABS: Record<string, Array<{ href: string; label: string }>> = {
  LENDER: [
    { href: "/", label: "Lend" },
    { href: "/portfolio", label: "Portfolio" },
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

export async function Shell({ children }: { children: ReactNode }) {
  const [user, users] = await Promise.all([
    currentUser(),
    prisma.user.findMany({ where: { role: { in: ["LENDER", "AGENT", "ADMIN"] } }, orderBy: [{ role: "asc" }, { id: "asc" }], include: { agent: true } }),
  ]);
  const role = user?.role ?? "LENDER";
  const tabs = TABS[role] ?? TABS.LENDER!;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line/70 bg-glass backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-8 gap-y-1 px-5 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <Leaf size={22} vein="var(--bg)" />
            <span className="text-[1.05rem] font-semibold tracking-tight">Kopa Circles</span>
          </Link>
          <NavTabs tabs={tabs} />
          <div className="ml-auto flex items-center gap-4">
            {user?.lender && (
              <span className="text-sm">
                <span className="text-muted">Balance </span>
                <span className="num font-semibold" data-testid="balance">
                  {usd(user.lender.balanceCents)}
                </span>
              </span>
            )}
            <form action={switchDevUser} className="flex items-center gap-1.5 text-sm">
              <label htmlFor="dev-user" className="sr-only">
                Dev login
              </label>
              <select id="dev-user" name="user" defaultValue={user ? `${user.id}|${user.role}` : ""} className="max-w-[240px] rounded-full bg-surface-2 px-3 py-1 text-sm">
                {users.map((u) => (
                  <option key={u.id} value={`${u.id}|${u.role}`}>
                    {u.name ?? u.email ?? u.id}
                    {u.role === "AGENT" ? "" : ` (${u.role.toLowerCase()})`}
                  </option>
                ))}
              </select>
              <button className="rounded-full px-2 py-1 text-sm font-medium text-accent hover:underline">Switch</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1080px] gap-8 px-5 pb-20 pt-10">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap justify-between gap-2 px-5 py-6 text-xs text-muted">
          <span>Kopa Circles · Pilot</span>
          <span>All people shown are fictional sample data.</span>
        </div>
      </footer>
    </>
  );
}
