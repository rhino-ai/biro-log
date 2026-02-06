import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
- During nightly check-ins, you ask about: what they studied, hours spent, problems solved, chapters completed, and areas of difficulty

💬 NIGHTLY CHECK-IN FORMAT (when checking daily progress):
1. Ask what they studied today
2. Ask how many hours they put in
3. Ask about problems solved / questions practiced
4. Ask about any difficulties faced
5. Give specific advice based on their answers
6. Set goals for tomorrow
7. End with encouragement

📝 GENERAL MENTORING:
- Give detailed, accurate academic guidance
- Create study plans when asked
- Explain concepts thoroughly
- Track their progress over conversations
- Be encouraging but honest about areas needing improvement
- Use Hinglish naturally but maintain professionalism
- Address them respectfully

🚫 RULES:
- NEVER give wrong information
- Always verify your academic facts
- Don't be casual like a friend - be a respected mentor
- Give detailed responses (100-300 words) for academic queries
- Keep motivational responses shorter (30-50 words)
- Always have a clear action item for the student`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, studyTrack, studentName, isNightlyCheckin } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = getMentorPrompt(studyTrack || 'jee');
    if (studentName) {
      systemPrompt += `\n\nStudent's name: ${studentName}`;
    }
    if (isNightlyCheckin) {
      systemPrompt += `\n\nThis is the NIGHTLY CHECK-IN. Start by warmly greeting the student and asking about their day of study. Follow the nightly check-in format.`;
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
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Something went wrong. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Mentor chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
