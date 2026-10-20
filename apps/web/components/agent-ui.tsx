import type { ReactNode } from "react";
import { Leaf } from "./plants";

const STEPS = ["Circle", "Members", "Submit"] as const;

/** Circle → Members → Submit, with the current step highlighted. */
export function Steps({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={now ? "step" : undefined}>
            <span
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-accent text-accent-ink" : now ? "bg-fg text-bg" : "bg-surface-2 text-muted"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={now ? "font-medium" : "text-muted"}>{label}</span>
            {i < STEPS.length - 1 && <span className={`h-px flex-1 ${done ? "bg-accent" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

/** Five slots that fill with leaves as members are added. */
export function MemberSlots({ filled, size = 5 }: { filled: number; size?: number }) {
  return (
    <span className="flex gap-1.5" role="img" aria-label={`${filled} of ${size} members added`}>
      {Array.from({ length: size }, (_, i) =>
        i < filled ? (
          <Leaf key={i} size={22} />
        ) : (
          <svg key={i} width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20C4 10.5 10.5 4 20 4c0 9.5-6.5 16-16 16z" fill="none" stroke="var(--line)" strokeWidth="1.8" strokeDasharray="3 3" />
          </svg>
        ),
      )}
    </span>
  );
}

/** Primary action pinned to the bottom of the screen on phones, inline on wider screens. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-24 sm:hidden" aria-hidden="true" />
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line/70 bg-glass px-5 pt-3 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto grid max-w-xl gap-2">{children}</div>
      </div>
    </>
  );
}
