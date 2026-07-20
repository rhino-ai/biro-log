import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Client calls this right after inserting a chat/invite so we can fan out a
// push to the recipients (like WhatsApp/Telegram). Auth = sender's JWT.
// type: 'dm' | 'group' | 'group_invite'
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(token);
    const senderId = claims?.claims?.sub as string | undefined;
    if (!senderId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const type = String(body.type || "");
    const preview = String(body.preview || "").slice(0, 140);
    const hasAttachment = !!body.hasAttachment;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Sender profile for title
    const { data: senderProf } = await admin
      .from("profiles")
      .select("name")
      .eq("user_id", senderId)
      .maybeSingle();
    const senderName = senderProf?.name || "Someone";

    let targetIds: string[] = [];
    let title = "";
    let text = preview || (hasAttachment ? "📎 Attachment" : "New message");
    let url = "/friends";
    let tag = `chat-${Date.now()}`;

    if (type === "dm") {
      const receiverId = String(body.receiverId || "");
      if (!/^[0-9a-f-]{36}$/i.test(receiverId)) return json({ error: "bad receiver" }, 400);
      targetIds = [receiverId];
      title = senderName;
      tag = `dm-${senderId}`;
    } else if (type === "group") {
      const groupId = String(body.groupId || "");
      if (!/^[0-9a-f-]{36}$/i.test(groupId)) return json({ error: "bad group" }, 400);
      const [{ data: group }, { data: members }] = await Promise.all([
        admin.from("chat_groups").select("name").eq("id", groupId).maybeSingle(),
        admin.from("group_members").select("user_id").eq("group_id", groupId),
      ]);
      targetIds = (members || []).map((m: any) => m.user_id).filter((id: string) => id !== senderId);
      title = group?.name ? `${group.name}` : "Group message";
      text = `${senderName}: ${text}`;
      url = "/friends";
      tag = `grp-${groupId}`;
    } else if (type === "group_invite") {
      const groupId = String(body.groupId || "");
      const targetId = String(body.targetId || "");
      if (!/^[0-9a-f-]{36}$/i.test(targetId)) return json({ error: "bad target" }, 400);
      const { data: group } = await admin.from("chat_groups").select("name").eq("id", groupId).maybeSingle();
      targetIds = [targetId];
      title = "Added to a group";
      text = `${senderName} added you to ${group?.name || "a group"}`;
      url = "/friends";
      tag = `invite-${groupId}`;
    } else {
      return json({ error: "bad type" }, 400);
    }

    if (targetIds.length === 0) return json({ ok: true, sent: 0 });

    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        title,
        body: text,
        url,
        tag,
        renotify: true,
        user_ids: targetIds,
      }),
    });
    const out = await r.json().catch(() => ({}));
    return json({ ok: true, ...out });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}