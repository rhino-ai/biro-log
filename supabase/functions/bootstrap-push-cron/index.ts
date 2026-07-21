import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// One-shot bootstrap: reschedules the push-scheduler cron job with the CRON_SECRET header baked in.
// Idempotent — safe to call again to rotate the secret.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("CRON_SECRET");
    if (!secret) throw new Error("CRON_SECRET not configured");

    // Require the shared secret in the request header. Prevents anonymous callers
    // from triggering cron rescheduling from the internet.
    const provided = req.headers.get("x-cron-secret") || "";
    if (provided.length !== secret.length || provided !== secret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await admin.rpc("admin_reschedule_push_cron", {
      _secret: secret,
      _job_name: "push-scheduler-every-15min",
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});