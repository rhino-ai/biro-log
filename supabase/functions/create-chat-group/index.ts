import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in to create groups." }, 401);

    const backend = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await backend.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return json({ error: "Please sign in to create groups." }, 401);

    const { name, icon } = await req.json().catch(() => ({}));
    const cleanName = String(name ?? "").trim();
    const cleanIcon = String(icon ?? "👥").trim().slice(0, 16) || "👥";
    if (cleanName.length < 2) return json({ error: "Group name is too short." }, 400);
    if (cleanName.length > 80) return json({ error: "Group name is too long." }, 400);

    const { data: group, error } = await backend
      .from("chat_groups")
      .insert({ name: cleanName, icon: cleanIcon, created_by: user.id, is_public: false })
      .select("id,name,icon,invite_code,created_by,created_at")
      .single();

    if (error) throw error;
    return json({ group });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not create group." }, 500);
  }
});