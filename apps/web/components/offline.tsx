"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { discard, useAutoSync, useOnline, usePending } from "@/lib/offline-queue";

/** A quiet banner on agent screens while there's no signal or work is waiting. */
export function ConnectionBanner() {
  const online = useOnline();
  const pending = usePending();
  const waiting = pending.filter((p) => !p.error).length;
  if (online && waiting === 0) return null;
  return (
    <div role="status" className={`rounded-xl px-4 py-2.5 text-sm ${online ? "bg-sun-soft" : "bg-surface-2"}`}>
      {online
        ? `Sending ${waiting} saved member${waiting === 1 ? "" : "s"}…`
        : `You're offline. New members are saved on this phone${waiting ? ` (${waiting} waiting)` : ""} and sent when you have signal.`}
    </div>
  );
}

/** Members saved on this phone for one circle, sent automatically when online. */
export function PendingMembers({ circleId }: { circleId: string }) {
  const router = useRouter();
  const pending = usePending(circleId);
  const online = useOnline();
  const refresh = useCallback(() => router.refresh(), [router]);
  useAutoSync(refresh);

  if (pending.length === 0) return null;
  return (
    <ul className="grid gap-3" aria-label="Saved on this phone">
      {pending.map((p) => (
        <li key={p.id} aria-label={`${p.fields.name} (saved on this phone)`} className="grid gap-1 rounded-card border-2 border-dashed border-line bg-surface p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{p.fields.name}</span>
            <button type="button" onClick={() => discard(p.id)} className="px-1 text-sm text-muted hover:text-bad">
              Discard
            </button>
          </div>
          <span className="text-sm text-muted">{p.fields.business}</span>
          {p.error ? (
            <span className="text-sm text-bad">Couldn’t add: {p.error}</span>
          ) : (
            <span className="text-sm text-muted">{online ? "Sending…" : "Saved on this phone. Waiting for signal."}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Keeps sending saved members from any agent screen. */
export function OfflineSync() {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  useAutoSync(refresh);
  return null;
}

/** Registers the service worker that keeps agent pages usable without signal (production builds). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/** Right after sign-out, drop cached pages from this device. Saved-but-unsent members are kept. */
export function ClearOfflinePages() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage("clear-pages");
    document.cookie = "kopa_clear_pages=; Max-Age=0; path=/";
  }, []);
  return null;
}
