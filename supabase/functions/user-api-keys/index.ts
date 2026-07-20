import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { encryptKey } from "../_shared/user-keys.ts";

const SUPPORTED = new Set(["gemini", "openai", "anthropic", "openrouter"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === "GET") {
      const { data, error } = await admin
        .from("user_api_keys")
        .select("provider,label,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ keys: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const provider = String(body.provider || "").toLowerCase();
    if (!SUPPORTED.has(provider)) {
      return new Response(JSON.stringify({ error: "Unsupported provider" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "DELETE" || body.action === "delete") {
      const { error } = await admin.from("user_api_keys").delete().eq("user_id", userId).eq("provider", provider);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST / PUT — save/upsert
    const key = String(body.key || "").trim();
    const label = body.label ? String(body.label).slice(0, 60) : null;
    if (key.length < 10 || key.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { ciphertext, iv } = await encryptKey(key);
    const { error } = await admin
      .from("user_api_keys")
      .upsert({ user_id: userId, provider, key_ciphertext: ciphertext, iv, label }, { onConflict: "user_id,provider" });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});