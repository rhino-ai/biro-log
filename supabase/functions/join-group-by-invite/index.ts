import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Please sign in to join groups." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const backend = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await backend.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Please sign in to join groups." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { code } = await req.json().catch(() => ({}));
    const cleanCode = String(code || "").trim().toUpperCase();
    if (!/^GRP[A-Z0-9]{6,16}$/.test(cleanCode)) {
      return new Response(JSON.stringify({ error: "Invalid invite code." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await backend.from("group_invite_attempts").delete().lt("attempted_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
    const { count } = await backend
      .from("group_invite_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("attempted_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
    if ((count || 0) >= 20) {
      return new Response(JSON.stringify({ error: "Too many invite attempts. Please wait a few minutes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await backend.from("group_invite_attempts").insert({ user_id: user.id });

    const { data: group } = await backend.from("chat_groups").select("id,name").eq("invite_code", cleanCode).maybeSingle();
    if (!group) {
      return new Response(JSON.stringify({ error: "Invalid invite code." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: joinError } = await backend.from("group_members").upsert(
      { group_id: group.id, user_id: user.id, role: "member" },
      { onConflict: "group_id,user_id" },
    );
    if (joinError) throw joinError;

    return new Response(JSON.stringify({ ok: true, groupId: group.id, name: group.name }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Could not join group." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});