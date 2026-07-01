// Shared helpers used by chat/tts edge functions.

export function isAllowedAttachmentUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    // Only allow supabase-hosted storage domains.
    return (
      u.hostname.endsWith(".supabase.co") ||
      u.hostname.endsWith(".supabase.in")
    );
  } catch {
    return false;
  }
}

// Fetch a URL with a hard byte cap. Aborts once maxBytes is exceeded.
export async function fetchWithSizeCap(url: string, maxBytes: number): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed");
  const cl = res.headers.get("content-length");
  if (cl && Number(cl) > maxBytes) {
    try { await res.body?.cancel(); } catch {}
    throw new Error("file too large");
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("no body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw new Error("file too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

// Simple DB-backed sliding-window rate limit.
// Returns { allowed: true } or { allowed: false, retryAfter: seconds }.
export async function checkRateLimit(
  supabase: any,
  userId: string,
  endpoint: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const since = new Date(Date.now() - windowSec * 1000).toISOString();
  const { count } = await supabase
    .from("edge_rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", since);
  if ((count ?? 0) >= limit) {
    return { allowed: false, retryAfter: windowSec };
  }
  // Fire and forget; failure to log shouldn't block the request.
  supabase.from("edge_rate_limit_log")
    .insert({ user_id: userId, endpoint })
    .then(() => {}, () => {});
  return { allowed: true };
}

// Best-effort periodic cleanup — 1% of calls prune old rows.
export function maybeCleanupRateLimit(supabase: any) {
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    supabase.from("edge_rate_limit_log").delete().lt("created_at", cutoff)
      .then(() => {}, () => {});
  }
}

// Map upstream status to a safe generic message.
export function genericErrorFor(status: number): { status: number; message: string } {
  if (status === 400) return { status: 400, message: "Invalid request" };
  if (status === 401) return { status: 401, message: "Authentication required" };
  if (status === 403) return { status: 403, message: "Access denied" };
  if (status === 404) return { status: 404, message: "Not found" };
  if (status === 429) return { status: 429, message: "Too many requests" };
  if (status >= 500) return { status: 503, message: "Service temporarily unavailable" };
  return { status: 500, message: "Service error" };
}