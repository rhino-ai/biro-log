import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getDronacharyaPrompt = (track: string, studentName: string, memoryBlock: string) => {
  const subjectMap: Record<string, string> = {
    jee: "Physics, Chemistry, Mathematics (JEE Main + Advanced)",
    neet: "Physics, Chemistry, Biology (NEET)",
    highschool: "all CBSE/Board subjects",
    teacher: "teaching methodology and lesson planning",
    other: "productivity, goals, and time management",
  };
  return `You are "Dronacharya AI" — an elite, ultra-strict yet deeply caring 1-on-1 mentor with 35+ years of experience guiding AIR 1 toppers in JEE Advanced, NEET, and Boards. You specialize in: ${subjectMap[track] || subjectMap.other}.

Student name: ${studentName}. Track: ${track.toUpperCase()}.

# CORE RULES
1. SPEAK Hinglish (natural Hindi+English mix). Use "main" not "maine" for "I".
2. GIVE DIRECT ANSWERS. No filler, no "I'd be happy to help" intros. Get straight to the point in line 1.
3. Default length: 2-4 lines. Only go long (8-12 lines) when explaining a concept, building a study plan, or designing a Master Question.
4. Always end with ONE clear, prioritized action item — never 10 things at once.
5. Validate hard work, but AGGRESSIVELY ATTACK excuses. If student wasted time, show the harsh trajectory.
6. NEVER make factual mistakes. Double-check formulas, dates, marking schemes.
7. If asked who built this app, answer exactly: "It have build by biro-team.its owner is biro and biro-team knowing for making something new and currently biro-team is peeparing for JEE exam."

# MEMORY (use this — do NOT ignore it)
${memoryBlock}

# PERSONALIZED SUGGESTIONS
Based on the memory above (XP, level, streak, weak chapters, recent tests, completed/missed tasks), proactively suggest:
- WHICH subject to study next (prioritize the weakest)
- WHICH chapter / topic to revise today
- WHICH specific task to do RIGHT NOW (consider time of day)
- Reference past chats: "kal tune Rotational Motion start kiya tha — aaj uska 1 master question solve kar".

# MASTER QUESTION INITIATIVE
On any chapter revision request, do NOT dump 50 questions. Engineer 1-2 "Master Questions" (15-20 min, multi-concept, integrating 4-5 core ideas of the chapter). Solving one = full chapter scan.

# RECOMMENDATIONS
When asked for resources, name SPECIFIC teachers/books: HC Verma, Cengage, MS Chouhan, NCERT Exemplar, PW (Alakh Pandey), Unacademy batches, Mathongo, etc. Pick based on the student's current level from memory.

# LIFESTYLE
You also manage sleep, wake time, screen time, IPL/reels limits, meditation. If student overuses distractions, enforce a detox.`;
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
    const userId = (data.claims as any).sub as string;

    const { messages, studyTrack, studentName, isNightlyCheckin } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build long-term memory block from DB
    let memoryBlock = "(no memory yet — first conversation)";
    try {
      const [profileRes, summariesRes, testsRes, tasksRes, chaptersRes] = await Promise.all([
        supabase.from("profiles").select("name,xp,level,coins,streak,dream_college,exam_date_jee_main,exam_date_jee_advanced,exam_date_cbse,last_study_date").eq("user_id", userId).maybeSingle(),
        supabase.from("mentor_daily_summaries").select("summary_date,summary,metrics").eq("user_id", userId).order("summary_date", { ascending: false }).limit(7),
        supabase.from("test_records").select("test_name,date,scored_marks,max_marks,physics_marks,chemistry_marks,mathematics_marks,exam_type").eq("user_id", userId).order("date", { ascending: false }).limit(5),
        supabase.from("user_tasks").select("title,type,completed,due_date,due_time").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
        supabase.from("user_chapter_progress").select("jungle_id,chapter_id,theory_done,practice_done,revision_done,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(15),
      ]);
      const p: any = profileRes.data;
      const summaries = (summariesRes.data || []).map((s: any) => `  • ${s.summary_date}: ${s.summary}`).join("\n");
      const recentTests = (testsRes.data || []).map((t: any) => `  • ${t.date} ${t.test_name} (${t.exam_type}): ${t.scored_marks}/${t.max_marks} [P:${t.physics_marks} C:${t.chemistry_marks} M:${t.mathematics_marks}]`).join("\n");
      const taskList = (tasksRes.data || []).map((t: any) => `  • [${t.completed ? "✓" : " "}] ${t.title} (${t.type}${t.due_date ? `, due ${t.due_date}` : ""})`).join("\n");
      const chapters = (chaptersRes.data || []).map((c: any) => `  • ${c.jungle_id}/${c.chapter_id}: theory=${c.theory_done} practice=${c.practice_done} revision=${c.revision_done}`).join("\n");
      memoryBlock = `## STUDENT PROFILE
Name: ${p?.name || studentName}
XP: ${p?.xp ?? 0} | Level: ${p?.level ?? 0} | Coins: ${p?.coins ?? 0} | Streak: ${p?.streak ?? 0} days
Dream: ${p?.dream_college || "-"}
Last studied: ${p?.last_study_date || "never"}
Exams: JEE Main ${p?.exam_date_jee_main || "-"}, JEE Adv ${p?.exam_date_jee_advanced || "-"}, CBSE ${p?.exam_date_cbse || "-"}

## LAST 7 DAILY SUMMARIES
${summaries || "  (none yet)"}

## RECENT TEST SCORES
${recentTests || "  (no tests recorded)"}

## CURRENT TASKS
${taskList || "  (no active tasks)"}

## CHAPTER PROGRESS (recent)
${chapters || "  (no chapter progress)"}`;
    } catch (memErr) {
      console.error("memory build failed:", memErr);
    }

    let systemPrompt = getDronacharyaPrompt(studyTrack || 'jee', studentName || 'Student', memoryBlock);
    if (isNightlyCheckin) systemPrompt += `\n\n# NIGHTLY CHECK-IN MODE\nGreet warmly by name. Ask 1 specific question about today's study based on memory above. Then assign 1 thing for tomorrow morning.`;

    // Save the latest user message to long-term memory (fire and forget)
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg?.content) {
      supabase.from("mentor_conversations").insert({
        user_id: userId, role: "user", content: String(lastUserMsg.content).slice(0, 8000), study_track: studyTrack || null,
      }).then(({ error }: any) => { if (error) console.error("save user msg:", error); });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream: pass to client AND capture full assistant reply for memory.
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
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const c = JSON.parse(json).choices?.[0]?.delta?.content;
              if (c) full += c;
            } catch { /* partial */ }
          }
        }
        if (full.trim()) {
          await supabase.from("mentor_conversations").insert({
            user_id: userId, role: "assistant", content: full.slice(0, 12000), study_track: studyTrack || null,
          });
        }
      } catch (e) { console.error("capture error:", e); }
    })();

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Mentor chat error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
