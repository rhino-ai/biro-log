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
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in to invite members." }, 401);

    const backend = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await backend.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return json({ error: "Please sign in to invite members." }, 401);

    const { groupId, userId, query } = await req.json().catch(() => ({}));
    const cleanGroupId = String(groupId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(cleanGroupId)) return json({ error: "Invalid group." }, 400);

    const { data: membership, error: membershipError } = await backend
      .from("group_members")
      .select("id")
      .eq("group_id", cleanGroupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: "Only group members can invite people." }, 403);

    let targetId = String(userId ?? "").trim();
    if (!targetId) {
      const cleanQuery = String(query ?? "").trim();
      if (cleanQuery.length < 2 || cleanQuery.length > 120) return json({ error: "Enter a valid user ID, name, invite code, or email." }, 400);
      let lookup = backend
        .from("profiles")
        .select("user_id")
        .or(`unique_id.eq.${cleanQuery.toUpperCase()},invite_code.eq.${cleanQuery.toUpperCase()},name.ilike.${cleanQuery}`)
        .limit(1);
      if (cleanQuery.includes("@")) lookup = backend.from("profiles").select("user_id").ilike("email", cleanQuery).limit(1);
      const { data: found, error: lookupError } = await lookup.maybeSingle();
      if (lookupError) throw lookupError;
      targetId = found?.user_id ?? "";
    }

    if (!/^[0-9a-f-]{36}$/i.test(targetId)) return json({ error: "User not found." }, 404);
    if (targetId === user.id) return json({ error: "You are already in this group." }, 400);

    const { error: joinError } = await backend.from("group_members").upsert(
      { group_id: cleanGroupId, user_id: targetId, role: "member" },
      { onConflict: "group_id,user_id" },
    );
    if (joinError) throw joinError;

    const { data: profile } = await backend
      .from("profiles")
      .select("user_id,name,avatar,level,xp,unique_id")
      .eq("user_id", targetId)
      .maybeSingle();

    return json({ ok: true, member: profile });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not invite member." }, 500);
  }
});