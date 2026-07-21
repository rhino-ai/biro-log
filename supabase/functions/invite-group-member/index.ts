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
      .select("id, role")
      .eq("group_id", cleanGroupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: "Only group members can invite people." }, 403);
    if (membership.role !== "admin") return json({ error: "Only group admins can add members." }, 403);

    let targetId = String(userId ?? "").trim();
    if (!targetId) {
      const cleanQuery = String(query ?? "").trim();
      if (cleanQuery.length < 2 || cleanQuery.length > 120) return json({ error: "Enter a valid user ID, name, invite code, or email." }, 400);
      // Reject PostgREST filter metacharacters. Prevents .or() / .ilike() injection.
      if (/[,()"'\\]/.test(cleanQuery)) return json({ error: "Invalid characters in search." }, 400);
      const upper = cleanQuery.toUpperCase();
      const isEmail = cleanQuery.includes("@");
      // Escape PostgREST ilike wildcards so user input can't turn a name lookup into a wildcard sweep.
      const escLike = cleanQuery.replace(/[%_*]/g, (m) => "\\" + m);
      let found: { user_id: string } | null = null;
      if (isEmail) {
        const { data, error } = await backend.from("profiles").select("user_id").ilike("email", escLike).limit(1).maybeSingle();
        if (error) throw error;
        found = data;
      } else {
        // Try each field with its own parameterized query — no interpolated .or() string.
        for (const attempt of [
          () => backend.from("profiles").select("user_id").eq("unique_id", upper).limit(1).maybeSingle(),
          () => backend.from("profiles").select("user_id").eq("invite_code", upper).limit(1).maybeSingle(),
          () => backend.from("profiles").select("user_id").ilike("name", escLike).limit(1).maybeSingle(),
        ]) {
          const { data, error } = await attempt();
          if (error) throw error;
          if (data) { found = data; break; }
        }
      }
      targetId = found?.user_id ?? "";
    }

    if (!/^[0-9a-f-]{36}$/i.test(targetId)) return json({ error: "User not found." }, 404);
    if (targetId === user.id) return json({ error: "You are already in this group." }, 400);

    const { data: banned } = await backend
      .from("group_bans")
      .select("id")
      .eq("group_id", cleanGroupId)
      .eq("user_id", targetId)
      .maybeSingle();
    if (banned) return json({ error: "This user is banned from this group." }, 403);

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

    // Fire-and-forget push notification to the newly added member.
    try {
      const [{ data: group }, { data: inviter }] = await Promise.all([
        backend.from("chat_groups").select("name").eq("id", cleanGroupId).maybeSingle(),
        backend.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
      ]);
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        },
        body: JSON.stringify({
          title: "Added to a group",
          body: `${inviter?.name || "Someone"} added you to ${group?.name || "a group"}`,
          url: "/friends",
          tag: `invite-${cleanGroupId}`,
          renotify: true,
          user_ids: [targetId],
        }),
      });
    } catch (_) { /* best-effort */ }

    return json({ ok: true, member: profile });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not invite member." }, 500);
  }
});