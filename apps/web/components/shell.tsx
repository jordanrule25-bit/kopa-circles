import { prisma } from "@kopa/db";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth-actions";
import { switchDevUser } from "@/app/dev-user";
import { usd } from "@/lib/format";
import { currentUser, devLoginEnabled } from "@/lib/session";
import { NavTabs } from "./nav-tabs";
import { Leaf } from "./plants";

const TABS: Record<string, Array<{ href: string; label: string }>> = {
  LENDER: [
    { href: "/", label: "Lend" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/platform", label: "Report" },
  ],
  AGENT: [
    { href: "/agent", label: "My circles" },
    { href: "/", label: "Lend" },
  ],
  ADMIN: [
    { href: "/admin", label: "Today" },
    { href: "/admin/listings", label: "Listings" },
    { href: "/admin/repaying", label: "Repaying" },
    { href: "/admin/reserve", label: "Reserve" },
    { href: "/admin/agents", label: "Agents" },
    { href: "/platform", label: "Report" },
    { href: "/", label: "Lend" },
  ],
};

const PUBLIC_TABS = [
  { href: "/", label: "Lend" },
  { href: "/platform", label: "Report" },
];

export async function Shell({ children }: { children: ReactNode }) {
  const dev = devLoginEnabled();
  const [user, users] = await Promise.all([
    currentUser(),
    dev ? prisma.user.findMany({ where: { id: { startsWith: "sample-" } }, orderBy: [{ role: "asc" }, { id: "asc" }] }) : Promise.resolve([]),
  ]);
  const tabs = user ? (TABS[user.role] ?? TABS.LENDER!) : PUBLIC_TABS;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-fg px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
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
            {user ? (
              <form action={signOut} className="flex items-center gap-2 text-sm">
                <span className="hidden max-w-[160px] truncate text-muted sm:inline" title={user.email ?? user.phone ?? ""}>
                  {user.name ?? user.email ?? user.phone}
                </span>
                <button className="rounded-full px-2 py-1 font-medium text-accent hover:underline">Sign out</button>
              </form>
            ) : (
              <Link href="/signin" className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink hover:brightness-110">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      {dev && (
        <form action={switchDevUser} className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-end gap-2 px-5 pt-3 text-xs text-muted">
          <span>Dev login</span>
          <label htmlFor="dev-user" className="sr-only">
            Switch account
          </label>
          <select id="dev-user" name="user" defaultValue={user?.id ?? ""} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-fg">
            <option value="" disabled>
              Choose an account
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email ?? u.id}
                {u.role === "AGENT" ? "" : ` (${u.role.toLowerCase()})`}
              </option>
            ))}
          </select>
          <button className="rounded-full px-2 py-1 font-medium text-accent hover:underline">Switch</button>
          <Link href="/dev/outbox" className="font-medium text-accent hover:underline">
            Outbox
          </Link>
        </form>
      )}
      <main id="main" tabIndex={-1} className="mx-auto grid max-w-[1080px] gap-8 px-5 pb-20 pt-10 outline-none">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap justify-between gap-2 px-5 py-6 text-xs text-muted">
          <span>Kopa Circles · Pilot</span>
          <span>All people shown are fictional sample data.</span>
        </div>
      </footer>
    </>
  );
}
