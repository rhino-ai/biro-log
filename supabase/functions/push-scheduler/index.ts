import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

// Runs on a schedule (every 15 min via pg_cron). Decides what to push based on IST hour.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Require the shared cron secret so only the internal scheduler (or admin caller) can invoke this.
  const provided = req.headers.get("x-cron-secret") || "";
  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Compute current IST hour/minute
    const nowUtc = new Date();
    const ist = new Date(nowUtc.getTime() + 5.5 * 60 * 60 * 1000);
    const h = ist.getUTCHours();
    const m = ist.getUTCMinutes();

    // Distinct users with a push subscription
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("user_id");
    if (error) throw error;
    const userIds = Array.from(new Set((subs || []).map((s: any) => s.user_id)));
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no-subs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tasks: Array<{ tag: string; title: string; body: string; url: string; hourMatch: boolean }> = [
      // 10 PM IST nightly check-in (fires in the 22:00–22:14 window)
      {
        tag: "nightly-checkin",
        title: "🌙 10 PM Check-in",
        body: "Aaj ka din kaisa raha? Mentor waiting — 5 min ka time?",
        url: "/mentor",
        hourMatch: h === 22 && m < 15,
      },
      // 7 AM IST morning kickoff
      {
        tag: "morning-kickoff",
        title: "☀️ Uth ja, shuru karo",
        body: "Aaj ka plan check karo. Chalo padhai shuru.",
        url: "/tasks",
        hourMatch: h === 7 && m < 15,
      },
      // 1 PM IST midday nudge
      {
        tag: "midday-nudge",
        title: "⚡ Midday check",
        body: "Aadha din gaya — pending tasks pura karo.",
        url: "/tasks",
        hourMatch: h === 13 && m < 15,
      },
    ];

    const results: Record<string, unknown> = {};
    for (const t of tasks) {
      if (!t.hourMatch) continue;
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          title: t.title,
          body: t.body,
          url: t.url,
          tag: t.tag,
          user_ids: userIds,
        }),
      });
      results[t.tag] = await r.json().catch(() => ({ status: r.status }));
    }

    return new Response(JSON.stringify({ ok: true, ist: `${h}:${m}`, users: userIds.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});