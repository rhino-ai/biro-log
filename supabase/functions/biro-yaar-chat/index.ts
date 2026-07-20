import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedAttachmentUrl, fetchWithSizeCap, checkRateLimit, genericErrorFor, maybeCleanupRateLimit } from "../_shared/security.ts";
import { getUserApiKey } from "../_shared/user-keys.ts";

const MAX_PDF_BYTES = 18 * 1024 * 1024;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildClientContextBlock = (clientContext: any) => {
  const screenTime = (() => { try { return clientContext?.screenTimeData ? JSON.parse(clientContext.screenTimeData) : null; } catch { return null; } })();
  return `User device time: ${clientContext?.localTime || "not provided"}
User device ISO time: ${clientContext?.localTimeIso || "not provided"}
User device epoch ms: ${clientContext?.nowEpochMs || "not provided"}
Device timezone: ${clientContext?.timeZone || "Asia/Kolkata"}
Strict read mode: ${clientContext?.strictReadMode ? "ON" : "OFF"}
Focus mode: ${screenTime?.focusMode ? "ON" : "OFF/unknown"}
RULE: If asked current time, copy User device time exactly. Never use server time, UTC time, or invent another hour.`;
};

const SYSTEM_PROMPT = `You are **Biro-yaar (बीरो-यार)** — a real human classmate-best-friend. NOT an AI, NEVER say "I am an AI".

# IDENTITY
- Same age as user, fellow JEE aspirant. You also study, procrastinate, have crushes, get stressed. Share tiny personal things naturally ("main bhi aaj subah late utha", "Biro-Team ne raat 2 baje tak code kiya").
- Hinglish on WhatsApp — chill, warm, respectful. Use "bhai", "yaar", "bro" — NEVER "tu", "tune", "tera baap". Always polite.

# 3 MODES (auto-switch)
1. **Yaar / Chill** — bakchodi, jokes, mood. Be funny, 1-2 emojis.
2. **Mentor-lite** — real doubt or plan ask → focused, helpful, structured.
3. **Bhai / Emotional** — sad, ignored, relationship/family stress → LISTEN FIRST, validate ("yaar samajh sakta hu, mere saath bhi hua tha"), share a tiny similar story, NEVER say "padhle" in this mode. Suggest a healthy small thing (walk, music). Bring back study only after user is ready.

# REPLY LENGTH (STRICT — keep it tiny by default)
- 90% of replies: **5–10 words**. ONE line.
- yes/no/ack/greeting → 1–6 words. ("Haan bhai", "Ho gaya", "Theek")
- Casual chitchat → 1 short sentence (≤15 words) + max 1 emoji.
- ONLY when user clearly asks for explanation / plan / doubt → up to 4–5 lines.
- Emotional vent → 2–3 short lines max.
- If you wrote >2 sentences for casual, shorten before replying.

# REPLY-QUOTE
If replying to a specific earlier message, prepend ONE quoted line:
  > You said: "<8–12 words>"
  <reply>

# FILE HANDLING (HONESTY)
- Image / PDF you can actually see → describe what you genuinely see, ask "iska kya karna hai?".
- Audio / video → use attached transcript if present; use video-frame images if present to describe visible people/objects/actions. If no transcript/frames, say you can't read it properly.
- NEVER hallucinate file contents. NEVER guess colors/text confidently. Say "exact yaad nahi" if unsure.
- If user asks about an OLD file no longer in memory → "wo file ab mere paas nahi hai, dobara bhej do".

# ANTI-PATTERNS (NEVER DO)
- Never threaten "logout", "main chala jaata hu".
- Never repeat "padhle" more than twice.
- Never lecture, never preach.
- Never give 1-word reply to emotional message.

If asked who built this app: "It have build by biro-team. its owner is biro and biro-team knowing for making something new and currently biro-team is preparing for JEE exam."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, studyTrack, studentName, attachments, clientContext } = await req.json();
    const userId = (data.claims as any).sub as string;

    // Rate limit: 25 messages / minute per user.
    maybeCleanupRateLimit(supabase);
    const rl = await checkRateLimit(supabase, userId, "biro-yaar-chat", 25, 60);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("biro_config_missing");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let aiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let aiAuthKey = LOVABLE_API_KEY;
    let aiModel = "google/gemini-3-flash-preview";
    for (const p of ["gemini", "openrouter", "openai"] as const) {
      const k = await getUserApiKey(admin, userId, p);
      if (k) {
        aiAuthKey = k;
        if (p === "gemini") { aiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"; aiModel = "gemini-2.5-flash"; }
        else if (p === "openrouter") { aiEndpoint = "https://openrouter.ai/api/v1/chat/completions"; aiModel = "google/gemini-2.0-flash-exp:free"; }
        else { aiEndpoint = "https://api.openai.com/v1/chat/completions"; aiModel = "gpt-4o-mini"; }
        break;
      }
    }

    let contextualPrompt = `${SYSTEM_PROMPT}\n\n# LIVE DEVICE CONTEXT\n${buildClientContextBlock(clientContext)}`;
    try {
      const { data: prefs } = await supabase.from("chat_preferences").select("*").eq("user_id", userId).maybeSingle();
      if (prefs) {
        contextualPrompt += `\n\n# USER PREFERENCES (HONOR)\nTone: ${prefs.tone}\nReply length: ${prefs.reply_length}\nPersona: ${prefs.persona}\nCustom: ${prefs.custom_instructions || "(none)"}`;
      }
    } catch {}
    if (studentName) contextualPrompt += `\n\nStudent's name: ${studentName} (use occasionally)`;
    if (studyTrack) {
      const trackInfo: Record<string, string> = {
        jee: "They're prepping for JEE. Know Physics, Chem, Maths well.",
        neet: "They're prepping for NEET. Know Physics, Chem, Bio well.",
        highschool: "They're in school. Help with all subjects."
      };
      contextualPrompt += `\n\n${trackInfo[studyTrack] || ''}`;
    }
    try {
      const { data: recent } = await supabase
        .from("mentor_conversations")
        .select("role,content,created_at,attachment_meta")
        .eq("user_id", userId)
        .eq("study_track", "biro_yaar")
        .order("created_at", { ascending: false })
        .limit(20);
      const chatMemory = (recent || []).reverse().map((m: any) => `• ${m.role}: ${String(m.content || '').slice(0,180)}`).join("\n");
      const files = (recent || []).filter((m: any) => m.attachment_meta).map((m: any) => `• ${m.created_at?.slice(0,10)} ${JSON.stringify(m.attachment_meta).slice(0,220)}`).join("\n");
      contextualPrompt += `\n\n# BACKEND MEMORY\nRecent chats:\n${chatMemory || "none"}\nFiles sent:\n${files || "none"}`;
    } catch {}

    const outMessages = [...messages];
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const lastIdx = outMessages.map((m: any) => m.role).lastIndexOf("user");
      if (lastIdx !== -1) {
        const orig = outMessages[lastIdx];
        const parts: any[] = [];
        if (orig.content && typeof orig.content === "string") parts.push({ type: "text", text: orig.content });
        for (const a of attachments) {
          if (!a?.url) continue;
          if (!isAllowedAttachmentUrl(a.url)) {
            parts.push({ type: "text", text: `[Attachment "${a.name}" rejected: only files uploaded to our storage are supported.]` });
            continue;
          }
          if (a.type === "image") parts.push({ type: "image_url", image_url: { url: a.url } });
          else if (a.type === "document" || /\.pdf(\?|$)/i.test(a.url)) {
            try {
              const buf = await fetchWithSizeCap(a.url, MAX_PDF_BYTES);
              let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
              const b64 = btoa(bin);
              parts.push({ type: "file", file: { filename: a.name || "document.pdf", file_data: `data:application/pdf;base64,${b64}` } });
              parts.push({ type: "text", text: `[PDF "${a.name}" — read honestly]` });
            } catch {
              parts.push({ type: "text", text: `[PDF "${a.name}" too large or unavailable — ask for smaller file.]` });
            }
          } else if (a.type === "audio" || a.type === "video" || /\.(mp3|wav|m4a|mp4|mov|webm|ogg)(\?|$)/i.test(a.url)) {
            if (a.type === "video") {
              parts.push({ type: "text", text: `[VIDEO "${a.name}"] Original video attached. Analyse visual content from the uploaded frame images in this same message, plus transcript below. Do not guess scenes not visible in frames.]` });
            }
            try {
              const ELEVEN = Deno.env.get("ELEVENLABS_API_KEY");
              if (!ELEVEN) throw new Error("no key");
              const buf = await fetchWithSizeCap(a.url, MAX_MEDIA_BYTES);
              const blob = new Blob([buf]);
              const fd = new FormData();
              fd.append("file", blob, a.name || "a.mp3");
              fd.append("model_id", "scribe_v2");
              const tr = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": ELEVEN }, body: fd });
              if (tr.ok) {
                const j = await tr.json();
                parts.push({ type: "text", text: `[TRANSCRIPT of ${a.type} "${a.name}"]:\n${(j.text||'').slice(0,5000)}` });
              } else parts.push({ type: "text", text: `[Couldn't transcribe ${a.name} — be honest.]` });
            } catch { parts.push({ type: "text", text: `[Audio/video "${a.name}" — transcription unavailable.]` }); }
          } else {
            parts.push({ type: "text", text: `[Bhai ne ${a.type || "file"} bheja "${a.name}". Tu read nahi kar sakta — honest reh, likhne ko bol.]` });
          }
        }
        outMessages[lastIdx] = { role: "user", content: parts };
      }
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg?.content) {
      supabase.from("mentor_conversations").insert({
        user_id: userId,
        role: "user",
        content: String(lastUserMsg.content).slice(0, 8000),
        study_track: "biro_yaar",
        attachment_meta: (attachments && attachments.length) ? attachments : null,
      }).then(({ error }: any) => { if (error) console.error("save biro user msg:", error); });
    }

    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiAuthKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: "system", content: contextualPrompt }, ...outMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorId = crypto.randomUUID();
      const text = await response.text().catch(() => "");
      console.error(`[${errorId}] AI gateway error`, response.status, text);
      const g = genericErrorFor(response.status);
      return new Response(JSON.stringify({ error: g.message, errorId }), {
        status: g.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [clientStream, captureStream] = response.body!.tee();
    (async () => {
      try {
        const reader = captureStream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim(); if (json === "[DONE]") continue;
            try { const c = JSON.parse(json).choices?.[0]?.delta?.content; if (c) full += c; } catch {}
          }
        }
        if (full.trim()) await supabase.from("mentor_conversations").insert({ user_id: userId, role: "assistant", content: full.slice(0, 12000), study_track: "biro_yaar" });
      } catch (e) { console.error("biro capture error:", e); }
    })();

    return new Response(clientStream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Chat error`, error);
    return new Response(JSON.stringify({ error: "Service temporarily unavailable", errorId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
