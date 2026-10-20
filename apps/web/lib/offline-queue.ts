"use client";

// Members an agent added without signal, kept on the phone until they're sent.
// Entries hold the member's phone and ID in plain text, so each one is deleted
// the moment the server accepts it.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { addQueuedMember } from "@/app/agent/actions";

export type Pending = { id: string; circleId: string; capturedAt: string; fields: Record<string, string>; error?: string };

const KEY = "kopa:pending-members:v1";
const EVENT = "kopa:queue";
const EMPTY: Pending[] = [];
let cache: { raw: string | null; list: Pending[] } = { raw: null, list: EMPTY };

function read(): Pending[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cache.raw) cache = { raw, list: raw ? (JSON.parse(raw) as Pending[]) : EMPTY };
    return cache.list;
  } catch {
    return EMPTY;
  }
}
function write(list: Pending[]) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage full or blocked: nothing more we can do on this device.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function queueMember(circleId: string, form: FormData) {
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && !k.startsWith("$")) fields[k] = v;
  write([...read(), { id: crypto.randomUUID(), circleId, capturedAt: new Date().toISOString(), fields }]);
}

export function discard(id: string) {
  write(read().filter((p) => p.id !== id));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePending(circleId?: string) {
  const all = useSyncExternalStore(subscribe, read, () => EMPTY);
  return circleId ? all.filter((p) => p.circleId === circleId) : all;
}

let syncing = false;

/** Sends every waiting entry. Stops at the first network failure; keeps per-entry errors for the agent to fix. */
export async function syncPending(): Promise<number> {
  if (syncing || !navigator.onLine) return 0;
  syncing = true;
  let sent = 0;
  try {
    for (const p of read().filter((x) => !x.error)) {
      let r: Awaited<ReturnType<typeof addQueuedMember>>;
      try {
        r = await addQueuedMember(p.circleId, p.fields, p.capturedAt);
      } catch {
        break; // still offline or the server is unreachable: try again later
      }
      if (r.ok) {
        write(read().filter((x) => x.id !== p.id));
        sent += 1;
      } else {
        write(read().map((x) => (x.id === p.id ? { ...x, error: r.error } : x)));
      }
    }
  } finally {
    syncing = false;
  }
  return sent;
}

/** Runs a sync now, whenever the connection returns, and every 30 seconds while there's work. */
export function useAutoSync(onSent?: (n: number) => void) {
  const run = useCallback(async () => {
    const n = await syncPending();
    if (n > 0) onSent?.(n);
  }, [onSent]);
  useEffect(() => {
    void run();
    window.addEventListener("online", run);
    const t = setInterval(() => read().some((p) => !p.error) && void run(), 30_000);
    return () => {
      window.removeEventListener("online", run);
      clearInterval(t);
    };
  }, [run]);
}

export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
