import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:biro@biro-log.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT"); // optional JSON

// ---- FCM (HTTP v1) helper for Android native tokens (endpoint = "fcm:<token>") ----
let cachedFcmToken: { token: string; exp: number } | null = null;

async function getGoogleAccessToken(): Promise<{ token: string; projectId: string } | null> {
  if (!FIREBASE_SERVICE_ACCOUNT) return null;
  const sa = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  if (cachedFcmToken && cachedFcmToken.exp - 60 > now) {
    return { token: cachedFcmToken.token, projectId: sa.project_id };
  }
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const signInput = `${enc(header)}.${enc(claim)}`;

  const pem = sa.private_key.replace(/-----[^-]+-----|\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signInput)));
  const jwt = `${signInput}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`FCM oauth failed: ${await res.text()}`);
  const j = await res.json();
  cachedFcmToken = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return { token: j.access_token, projectId: sa.project_id };
}

async function sendFcmV1(deviceToken: string, payload: PushPayload) {
  const creds = await getGoogleAccessToken();
  if (!creds) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  const message = {
    message: {
      token: deviceToken,
      notification: { title: payload.title, body: payload.body },
      data: {
        url: payload.url || "/",
        ...(payload.tag ? { tag: payload.tag } : {}),
      },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "biro_log_default",
          default_sound: true,
          default_vibrate_timings: true,
          ...(payload.tag ? { tag: payload.tag } : {}),
        },
      },
    },
  };
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${creds.projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(`FCM send failed ${res.status}: ${text}`);
    err.statusCode = res.status;
    throw err;
  }
  return res.json();
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  requireInteraction?: boolean;
  renotify?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const payload: PushPayload = {
      title: String(body.title || "Biro-log"),
      body: String(body.body || ""),
      url: body.url ? String(body.url) : "/",
      tag: body.tag ? String(body.tag) : undefined,
      icon: body.icon ? String(body.icon) : undefined,
      requireInteraction: !!body.requireInteraction,
      renotify: body.renotify !== false,
    };

    // Target: explicit user_ids from a trusted service caller, otherwise the JWT user.
    let targetIds: string[] = [];
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    const isService = bearer && bearer === SERVICE_KEY;

    if (isService && Array.isArray(body.user_ids)) {
      targetIds = body.user_ids.map(String);
    } else {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await client.auth.getUser();
      if (!u?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetIds = [u.user.id];
    }

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .in("user_id", targetIds);
    if (error) throw error;

    const results = await Promise.allSettled(
      (subs || []).map(async (s) => {
        try {
          if (s.endpoint.startsWith("fcm:")) {
            const deviceToken = s.endpoint.slice(4);
            await sendFcmV1(deviceToken, payload);
          } else {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify(payload),
              { TTL: 60 * 60 * 24 }
            );
          }
          return { id: s.id, ok: true };
        } catch (e: any) {
          const code = e?.statusCode;
          const msg = String(e?.message || e);
          const dead =
            code === 404 ||
            code === 410 ||
            /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT.*(token|registration)/i.test(msg);
          if (dead) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          }
          return { id: s.id, ok: false, code, error: String(e?.message || e) };
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r as any).value.ok).length;
    return new Response(JSON.stringify({ sent, total: subs?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});