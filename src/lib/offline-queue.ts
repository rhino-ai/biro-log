import { supabase } from "@/integrations/supabase/client";

/**
 * Small offline queue for chat messages + attachment uploads.
 * Persists to localStorage so a browser refresh / cold app start
 * does not lose the pending write. Flushes automatically when the
 * network comes back online.
 */

type QueuedInsert = {
  id: string;
  kind: "insert";
  table: "direct_messages" | "group_messages";
  row: Record<string, unknown>;
  attempts: number;
  createdAt: number;
};

type QueuedUpload = {
  id: string;
  kind: "upload";
  bucket: string;
  path: string;
  // base64 blob body so it survives serialization
  base64: string;
  contentType: string;
  followUp?: QueuedInsert;
  attempts: number;
  createdAt: number;
};

type Queued = QueuedInsert | QueuedUpload;

const KEY = "biro:offline-queue:v1";
const MAX_ATTEMPTS = 8;

function read(): Queued[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(q: Queued[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function queueSize() { return read().length; }

export function enqueueInsert(item: Omit<QueuedInsert, "id" | "attempts" | "createdAt" | "kind">) {
  const q = read();
  q.push({ ...item, kind: "insert", id: crypto.randomUUID(), attempts: 0, createdAt: Date.now() });
  write(q);
  scheduleFlush();
}

export async function enqueueUpload(params: {
  bucket: string;
  path: string;
  file: Blob;
  contentType: string;
  followUp?: Omit<QueuedInsert, "id" | "attempts" | "createdAt" | "kind">;
}) {
  const base64 = await blobToBase64(params.file);
  const q = read();
  q.push({
    kind: "upload",
    id: crypto.randomUUID(),
    bucket: params.bucket,
    path: params.path,
    base64,
    contentType: params.contentType,
    followUp: params.followUp
      ? { ...params.followUp, kind: "insert", id: crypto.randomUUID(), attempts: 0, createdAt: Date.now() }
      : undefined,
    attempts: 0,
    createdAt: Date.now(),
  });
  write(q);
  scheduleFlush();
}

let flushTimer: number | null = null;
function scheduleFlush(delayMs = 500) {
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => { void flush(); }, delayMs);
}

async function flush() {
  if (!navigator.onLine) return;
  const q = read();
  if (!q.length) return;

  const remaining: Queued[] = [];
  for (const item of q) {
    try {
      if (item.kind === "upload") {
        const bytes = base64ToBytes(item.base64);
        const { error } = await supabase.storage
          .from(item.bucket)
          .upload(item.path, bytes, { contentType: item.contentType, upsert: false });
        if (error && !/exists/i.test(error.message)) throw error;
        if (item.followUp) {
          const { error: insErr } = await (supabase.from(item.followUp.table) as any).insert(item.followUp.row);
          if (insErr) throw insErr;
        }
      } else {
        const { error } = await (supabase.from(item.table) as any).insert(item.row);
        if (error) throw error;
      }
    } catch (e) {
      item.attempts += 1;
      if (item.attempts < MAX_ATTEMPTS) remaining.push(item);
      else console.warn("[offline-queue] dropping after max attempts", item, e);
    }
  }
  write(remaining);
  if (remaining.length) scheduleFlush(2000 * Math.min(remaining[0].attempts + 1, 5));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => {
      const s = String(r.result);
      res(s.slice(s.indexOf(",") + 1));
    };
    r.readAsDataURL(blob);
  });
}
function base64ToBytes(b: string): Uint8Array {
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Auto-flush hooks
if (typeof window !== "undefined") {
  window.addEventListener("online", () => scheduleFlush(100));
  window.addEventListener("focus", () => scheduleFlush(100));
  // Initial attempt on load in case items were left over
  scheduleFlush(1500);
}