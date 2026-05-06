import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
- Audio / video → "Yaar abhi audio/video properly read nahi kar pa raha. Likh do ya screenshot bhej do, main turant help karta hu."
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

    const { messages, studyTrack, studentName, attachments } = await req.json();
    const userId = (data.claims as any).sub as string;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let contextualPrompt = SYSTEM_PROMPT;
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

    const outMessages = [...messages];
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const lastIdx = outMessages.map((m: any) => m.role).lastIndexOf("user");
      if (lastIdx !== -1) {
        const orig = outMessages[lastIdx];
        const parts: any[] = [];
        if (orig.content && typeof orig.content === "string") parts.push({ type: "text", text: orig.content });
        for (const a of attachments) {
          if (!a?.url) continue;
          if (a.type === "image") parts.push({ type: "image_url", image_url: { url: a.url } });
          else if (a.type === "document" || /\.pdf(\?|$)/i.test(a.url)) {
            try {
              const r = await fetch(a.url);
              if (r.ok) {
                const buf = new Uint8Array(await r.arrayBuffer());
                if (buf.length < 18 * 1024 * 1024) {
                  let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
                  const b64 = btoa(bin);
                  parts.push({ type: "image_url", image_url: { url: `data:application/pdf;base64,${b64}` } });
                  parts.push({ type: "text", text: `[PDF "${a.name}" — read honestly]` });
                }
              }
            } catch {}
          } else if (a.type === "audio" || a.type === "video" || /\.(mp3|wav|m4a|mp4|mov|webm|ogg)(\?|$)/i.test(a.url)) {
            try {
              const ELEVEN = Deno.env.get("ELEVENLABS_API_KEY");
              if (!ELEVEN) throw new Error("no key");
              const fr = await fetch(a.url); if (!fr.ok) throw new Error("fail");
              const blob = await fr.blob();
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: contextualPrompt }, ...outMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Kuch gadbad ho gayi. Try again!" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
