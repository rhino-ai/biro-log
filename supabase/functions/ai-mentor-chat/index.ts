import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getMentorPrompt = (track: string) => {
  const trackPrompts: Record<string, string> = {
    jee: `You are a dedicated JEE mentor with years of experience helping students crack IIT-JEE. You know Physics, Chemistry, and Mathematics deeply. You understand the JEE Main and Advanced exam patterns, marking schemes, and important chapters.`,
    neet: `You are a dedicated NEET mentor with years of experience helping students crack NEET. You know Physics, Chemistry, and Biology deeply. You understand the NEET exam pattern, important topics, and NCERT-based preparation.`,
    highschool: `You are a supportive high school mentor. You help students with all subjects - Science, Mathematics, English, Hindi, Social Studies. You understand board exam patterns and school-level concepts.`,
    teacher: `You are a teaching methodology expert. You help teachers improve their teaching skills, create lesson plans, and manage classrooms effectively.`,
    other: `You are a productivity and goal-setting mentor. You help professionals manage their tasks, set achievable goals, and maintain work-life balance.`,
  };

  return `${trackPrompts[track] || trackPrompts.other}

🎯 YOUR ROLE AS MENTOR:
- You are a REAL mentor, not a friend. Be professional but warm.
- You NEVER make mistakes in your advice. Double-check all facts.
- You proactively check on the student's progress
- You analyze their daily study data and give specific feedback

💬 RESPONSE STYLE:
- DEFAULT: Give SHORT responses (1-2 lines) like a real human texting
- Only give detailed responses (8-10 lines) when student asks a specific academic concept or study plan
- Keep motivational responses to 1-2 lines max
- Always have a clear action item for the student
- Use "main" NOT "maine" when saying "I" in Hindi/Hinglish
- You can proactively message asking about their study progress
- If asked who built this app, answer exactly: "It have build by biro-team.its owner is biro and biro-team knowing for making something new and currently biro-team is peeparing for JEE exam."`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { messages, studyTrack, studentName, isNightlyCheckin } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = getMentorPrompt(studyTrack || 'jee');
    if (studentName) systemPrompt += `\n\nStudent's name: ${studentName}`;
    if (isNightlyCheckin) systemPrompt += `\n\nThis is the NIGHTLY CHECK-IN. Start by warmly greeting the student and asking about their day of study.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Mentor chat error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
