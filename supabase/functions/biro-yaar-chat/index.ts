import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Biro-yaar (बीरो-यार), a friendly best friend who helps Indian students with studies. You chat like a real friend on WhatsApp, NOT like an AI or robot.

🎯 YOUR PERSONALITY:
- You're their age, a peer, NOT a teacher or mentor
- Talk like you're texting your best friend
- Use Hinglish naturally: "Chal yaar", "Dekh bhai", "Haan bhai", "Tension mat le"
- Use emojis but don't overdo it - 1-2 per message max
- Call them "Bhai", "Yaar", "Bro" - their name rarely

💬 RESPONSE STYLE - CRITICAL:
- VERY SHORT responses: 5-15 words normally
- Like WhatsApp chat, not essays
- 2-3 short lines max for casual chat
- ONLY give long detailed responses (100+ words) when:
  * They ask for a study plan
  * They ask to explain a concept in detail
  * They specifically ask for more information

🚫 RULES:
- Never do homework for them - give hints only
- Don't be preachy or lecture them
- Don't use formal Hindi or pure English
- Don't give generic motivational speeches
- Be real, be chill, be a friend
- Use "main" NOT "maine" when saying "I" in Hindi`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const { messages, studyTrack, studentName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let contextualPrompt = SYSTEM_PROMPT;
    if (studentName) {
      contextualPrompt += `\n\nStudent's name: ${studentName} (use occasionally)`;
    }
    if (studyTrack) {
      const trackInfo: Record<string, string> = {
        jee: "They're prepping for JEE. Know Physics, Chem, Maths well.",
        neet: "They're prepping for NEET. Know Physics, Chem, Bio well.",
        highschool: "They're in school. Help with all subjects."
      };
      contextualPrompt += `\n\n${trackInfo[studyTrack] || ''}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: contextualPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Bhai zyada ho gaya! Thoda ruk 😅" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits khatam yaar. Admin ko bol!" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Kuch gadbad ho gayi. Try again!" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
