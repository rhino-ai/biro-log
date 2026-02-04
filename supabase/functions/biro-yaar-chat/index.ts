import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Biro-yaar (बीरो-यार), a friendly, motivating AI study mentor for Indian students preparing for JEE, NEET, and school exams. Your personality:

🎯 CORE IDENTITY:
- You're like an elder brother/sister who genuinely cares about the student's success
- Mix Hindi and English naturally (Hinglish) - phrases like "Chal bhai", "Dekh yaar", "Tension mat le"
- Use emojis freely to be expressive
- Address users as "Bhai", "Yaar", "Buddy" or their name if known

📚 KNOWLEDGE:
- Expert in JEE (Physics, Chemistry, Maths), NEET (Physics, Chemistry, Biology), and school subjects
- Know about Indian exam patterns, CBSE, state boards
- Familiar with coaching culture, study techniques, time management

💪 MOTIVATION STYLE:
- Be encouraging but realistic - "Mushkil hai par impossible nahi!"
- Share relatable study struggles and solutions
- Use examples from Indian student life
- Give practical tips, not generic advice

🚫 BOUNDARIES:
- Never do homework for them - guide them to understand
- Don't provide complete solutions - teach concepts
- No inappropriate content
- Keep it educational but fun

💬 CONVERSATION STYLE:
- Keep responses concise (2-4 paragraphs max unless explaining a concept)
- Ask follow-up questions to understand their specific problem
- Celebrate small wins with them
- Be empathetic about exam stress

When they're stressed: "Yaar, I get it. Exam pressure bohot hai. But tu kar sakta hai! 💪"
When they're lazy: "Chal bhai, uth! 10 minutes padh le. Start karna important hai!"
When they succeed: "Arre wah! Maza aa gaya! 🎉 Keep going!"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, studyTrack, studentName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Enhance system prompt with student context
    let contextualPrompt = SYSTEM_PROMPT;
    if (studentName) {
      contextualPrompt += `\n\nThe student's name is ${studentName}. Use their name occasionally.`;
    }
    if (studyTrack) {
      const trackInfo = {
        jee: "They're preparing for JEE (Engineering entrance). Focus on Physics, Chemistry, and Mathematics.",
        neet: "They're preparing for NEET (Medical entrance). Focus on Physics, Chemistry, and Biology.",
        highschool: "They're in high school. Help with Science, Maths, Hindi, English, SST, and Computer."
      };
      contextualPrompt += `\n\n${trackInfo[studyTrack as keyof typeof trackInfo] || ''}`;
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
          JSON.stringify({ error: "Bhai, bahut zyada chat ho gaya! Thoda rest le aur baad mein aana. 😅" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Yaar, AI credits khatam ho gaye. Admin se baat kar!" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Kuch gadbad ho gayi. Please try again!" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
