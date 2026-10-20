"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ tabs }: { tabs: Array<{ href: string; label: string }> }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/circles") : path === href || path.startsWith(href + "/"));
  return (
    <nav className="flex w-full gap-1 overflow-x-auto" aria-label="Sections">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active(t.href) ? "page" : undefined}
          className={`whitespace-nowrap border-b-[3px] px-3 py-2.5 font-semibold ${active(t.href) ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
