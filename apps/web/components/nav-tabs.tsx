"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ tabs }: { tabs: Array<{ href: string; label: string }> }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/circles") : path === href || path.startsWith(href + "/"));
  return (
    <nav className="order-last flex w-full gap-5 overflow-x-auto text-sm sm:order-none sm:w-auto" aria-label="Sections">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active(t.href) ? "page" : undefined}
          className={`whitespace-nowrap py-1 transition-colors ${active(t.href) ? "font-medium text-fg" : "text-muted hover:text-fg"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
