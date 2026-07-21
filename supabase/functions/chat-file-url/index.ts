// Returns a short-lived (60s) signed URL for a chat attachment, but only if
// the caller is party to the message that owns the file. This prevents leaked
// long-lived URLs from being reused and stops anyone from guessing paths.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BUCKET = "chat-uploads";
const TTL = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.slice(7);
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const path = String(body.path || "").trim();
    const chatKind = body.kind === "group" ? "group" : "dm";
    const chatId = String(body.chatId || "").trim();

    if (!path || !chatId) return json({ error: "Missing path/chatId" }, 400);
    // Strict UUID validation prevents PostgREST filter injection via .or() strings.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(chatId)) return json({ error: "Bad chatId" }, 400);
    if (!UUID_RE.test(userId)) return json({ error: "Unauthorized" }, 401);
    // Basic path safety: no leading slash, no ..
    if (path.startsWith("/") || path.includes("..")) return json({ error: "Bad path" }, 400);
    if (path.length > 512) return json({ error: "Bad path" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Authorize: caller must be a party to a message referencing this path.
    if (chatKind === "dm") {
      // Two parameterized queries — no interpolated .or() filter, no injection surface.
      const [{ data: sent }, { data: recv }] = await Promise.all([
        admin
          .from("direct_messages")
          .select("id,sender_id,receiver_id,attachment_url,attachment_meta")
          .eq("sender_id", userId)
          .eq("receiver_id", chatId)
          .limit(500),
        admin
          .from("direct_messages")
          .select("id,sender_id,receiver_id,attachment_url,attachment_meta")
          .eq("sender_id", chatId)
          .eq("receiver_id", userId)
          .limit(500),
      ]);
      const rows = [...(sent || []), ...(recv || [])];
      if (!rows.some((r: any) => refMatchesPath(r, path))) {
        return json({ error: "Forbidden" }, 403);
      }
    } else {
      // Group: caller must be a member.
      const { data: mem } = await admin
        .from("group_members")
        .select("user_id")
        .eq("group_id", chatId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!mem) return json({ error: "Forbidden" }, 403);
      const { data: rows } = await admin
        .from("group_messages")
        .select("id,attachment_url")
        .eq("group_id", chatId)
        .limit(500);
      if (!rows?.some((r: any) => refMatchesPath(r, path))) {
        return json({ error: "Forbidden" }, 403);
      }
    }

    const { data: signed, error: sErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, TTL);
    if (sErr || !signed) return json({ error: "Sign failed" }, 500);

    return json({ url: signed.signedUrl, ttl: TTL });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "server error" }, 500);
  }
});

function refMatchesPath(row: any, path: string): boolean {
  if (row?.attachment_meta && typeof row.attachment_meta === "object") {
    if (row.attachment_meta.path === path) return true;
  }
  if (typeof row?.attachment_url === "string" && row.attachment_url.includes(encodeURIComponent(path))) return true;
  if (typeof row?.attachment_url === "string" && row.attachment_url.includes(path)) return true;
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}