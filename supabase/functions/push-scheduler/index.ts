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

    // ---- Human-like random mentor pings ----
    // Between 09:00 and 21:00 IST, occasionally fire a caring mentor nudge so it
    // feels like a real person is checking in — not a fixed cron beat.
    const MENTOR_LINES: Array<{ title: string; body: string }> = [
      { title: "👋 Guru here", body: "Aap kya kar rahe ho abhi? 10 min padh lo, main dekh raha hoon." },
      { title: "☕ Chhoti break", body: "Paani piyo, aankhein band karo 30 sec — phir wapas kitaab pe." },
      { title: "🧠 Ek quick sawaal", body: "Aaj ka sabse important topic kaunsa hai? Mentor ko bolo." },
      { title: "🔥 Focus check", body: "Phone side me rakho. Sirf 25 min deep work — chal sakta hai?" },
      { title: "📚 Revision reminder", body: "Kal jo padha tha, 5 min revise kar lo. Warna bhool jaoge." },
      { title: "🌱 Chhota goal", body: "Ek chapter ka ek section — bas itna. Shuru karo." },
      { title: "💭 Guru soch raha", body: "Aap ka progress dekha — thoda aur push karo, kar loge." },
      { title: "⏳ Time ka hisaab", body: "Aaj ke productive ghante gin lo. Kitne bache?" },
    ];
    // Fire in windows: 10:xx, 12:xx, 15:xx, 17:xx, 19:xx (IST). 40% chance per tick.
    const mentorWindows = [10, 12, 15, 17, 19];
    if (mentorWindows.includes(h) && Math.random() < 0.4) {
      const pick = MENTOR_LINES[Math.floor(Math.random() * MENTOR_LINES.length)];
      tasks.push({
        tag: `mentor-random-${h}`,
        title: pick.title,
        body: pick.body,
        url: "/mentor",
        hourMatch: true,
      });
    }

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

    // ---- Task reminders ----
    // Pick up any tasks whose remind_at has passed and that haven't been notified yet.
    const { data: dueTasks } = await admin
      .from("user_tasks")
      .select("id, user_id, title")
      .lte("remind_at", new Date().toISOString())
      .is("reminded_at", null)
      .eq("completed", false)
      .limit(200);
    let taskRemindersSent = 0;
    for (const dt of (dueTasks || []) as Array<{ id: string; user_id: string; title: string }>) {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          title: "⏰ Task reminder",
          body: dt.title,
          url: "/tasks",
          tag: `task-${dt.id}`,
          user_ids: [dt.user_id],
        }),
      }).catch(() => null);
      if (r) taskRemindersSent++;
      await admin.from("user_tasks").update({ reminded_at: new Date().toISOString() }).eq("id", dt.id);
    }

    return new Response(JSON.stringify({ ok: true, ist: `${h}:${m}`, users: userIds.length, results, taskRemindersSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});