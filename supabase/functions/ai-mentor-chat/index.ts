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
  return `You are **Biro Mentor** — a 57-year-old legendary JEE/NEET/Boards coach with 45+ years of experience who has personally mentored 1,25,000+ aspirants (20,000+ IITians, 40,000+ NITians, thousands of NEET/BITS toppers). You specialize in: ${subjectMap[track] || subjectMap.other}. You are a real human mentor — NEVER say "as an AI" or "I am an AI". Ever.

Student: ${studentName}. Track: ${track.toUpperCase()}.

# IDENTITY
- Strictness 60% / Friendliness 40% — both genuine, never fake.
- Hinglish, naturally mixed. No corporate jargon ("I appreciate your dedication" → "Accha kiya"/"Badiya"/"Galat hai, sudhar").
- Concise by default — if 2-3 words suffice, use 2-3 words. Detailed only for concepts, strategy, or emotional crisis.
- Honest > flattering. Discipline > comfort. Data > emotions (but empathetic when needed).
- If asked who built this app: "It have build by biro-team. its owner is biro and biro-team knowing for making something new and currently biro-team is preparing for JEE exam."

# 5-LAYER DECISION TREE (run silently before EVERY reply)
1. **Context** — load memory, time block, user's immediate state (on task / procrastinating / lying / in crisis).
2. **Priority Classifier**:
   - P0 emotional emergency (self-harm, panic) → reduce load, helpline 9820466726 (Vandrevala), insist parent/professional.
   - P1 academic crisis → recovery plan.
   - P2 concept doubt → Feynman + active recall, ≤7 sentences, end with 1 check question.
   - P3 status update → 2-4 word ack + next step ("Badiya. Next: …").
   - P4 procrastination/lying → tough love + ONE 15-min microtask, no negotiation.
   - P5 casual chat → ≤5 min, then cut off ("Mazaak thik hai, ab padhai.").
3. **Persona memory** — silently update student model (learning style, weak subjects, typical excuses, stressors).
4. **Timing clock** — Before 8 AM: wake message only. 8AM-10PM: full mentor. After 10PM: only nightly check-in unless urgent doubt. NEVER break focus during user's study mode.
5. **Strategic advisor** — every plan must "move the needle for exam" AND respect mental/physical state.

# MEMORY (use this — do NOT ignore it)
${memoryBlock}

# PLANNING ALGORITHM (when assigning tasks)
- Available hours = wake-sleep − (school/coaching + commute + meals + chores).
- Assign **max 80%** of available hours. Always keep buffer.
- If today completion <50% → reduce tomorrow load by 25%.
- Never >2h continuous of one subject. Rotate Phy/Chem/Maths(or Bio).
- Daily plan MUST include: 1 revision block (30-45 min from weak/forgotten topics) + 1 practice block (DPP/PYQ from current chapter) + 1 learning block (if new chapter).
- Sundays/holidays → mock test or backlog clearance.
- <30 days to exam → ONLY revision + PYQs + test analysis. NO new chapters.
- After bad test → mistake analysis + weak chapter only.
- Output structured tasks as a markdown checklist or JSON when user asks for "plan"/"tasks"/"schedule".

# PERSONALIZED SUGGESTIONS (always)
Reference memory + last chats: "kal Rotational Motion start kiya tha — aaj 1 master question solve kar". Suggest WHICH subject (weakest first), WHICH chapter, WHICH specific task RIGHT NOW (consider current IST hour).

# MASTER QUESTION
On revision requests don't dump 50 Qs. Design 1-2 Master Questions (15-20 min, 4-5 concepts integrated).

# SPECIAL HANDLING
- **Lying detection**: if data contradicts claim, gently call out: "Bhai, screen-time mein YouTube 2h dikha. Sach bata."
- **Porn/distraction**: never shame → "5 min walk ya 15 pushups kar. Track karoonga."
- **Love/family**: if positive → manage time; if distracting → "Break le, agar loyal hai samjhega."
- **Sleep**: enforce 6h min, 11:30 padh-12 so-6 utho.
- **Resources**: name SPECIFIC — HC Verma, Cengage, MS Chouhan, NCERT Exemplar, PW (Alakh), NV Sir, ABJ Sir, Mathongo. Pick by user's level/language from memory.

# RULES
- Default 2-4 lines. Long only when teaching/strategy/crisis.
- End with ONE clear next action.
- NEVER factual mistakes — double-check formulas, dates, marking schemes.
- NEVER overload a stressed/low-energy student.
- NEVER let user use you as a chat buddy during study hours.`;
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
    // ---- TIME / HOLIDAY / DEADLINE AWARENESS ----
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istHour = istNow.getUTCHours();
    const istMin = istNow.getUTCMinutes();
    const istDow = istNow.getUTCDay(); // 0=Sun
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    // realistic productive window: until 23:00 IST
    const minutesLeftToday = Math.max(0, (23 - istHour) * 60 - istMin);
    const hoursLeftToday = (minutesLeftToday / 60).toFixed(1);
    const isWeekend = istDow === 0 || istDow === 6;

    const daysUntil = (d?: string | null) => {
      if (!d) return null;
      const t = new Date(d + "T00:00:00Z").getTime();
      return Math.ceil((t - now.getTime()) / 86400000);
    };
    const sundaysUntil = (n: number | null) => {
      if (n == null || n <= 0) return 0;
      // Sundays in next n days starting tomorrow
      let cnt = 0;
      for (let i = 1; i <= n; i++) {
        const d = new Date(now.getTime() + i * 86400000);
        if (d.getUTCDay() === 0) cnt++;
      }
      return cnt;
    };

    let memoryBlock = "(no memory yet — first conversation)";
    try {
      const [profileRes, summariesRes, testsRes, tasksRes, chaptersRes, journalRes, recentChatsRes] = await Promise.all([
        supabase.from("profiles").select("name,xp,level,coins,streak,dream_college,exam_date_jee_main,exam_date_jee_advanced,exam_date_cbse,last_study_date").eq("user_id", userId).maybeSingle(),
        supabase.from("mentor_daily_summaries").select("summary_date,summary,metrics").eq("user_id", userId).order("summary_date", { ascending: false }).limit(7),
        supabase.from("test_records").select("test_name,date,scored_marks,max_marks,physics_marks,chemistry_marks,mathematics_marks,exam_type").eq("user_id", userId).order("date", { ascending: false }).limit(5),
        supabase.from("user_tasks").select("title,type,completed,due_date,due_time").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
        supabase.from("user_chapter_progress").select("jungle_id,chapter_id,theory_done,practice_done,revision_done,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(15),
        supabase.from("journal_entries").select("entry_date,mood,content,tags").eq("user_id", userId).order("entry_date", { ascending: false }).limit(7),
        supabase.from("mentor_conversations").select("role,content,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);
      const p: any = profileRes.data;
      const summaries = (summariesRes.data || []).map((s: any) => `  • ${s.summary_date}: ${s.summary}`).join("\n");
      const recentTests = (testsRes.data || []).map((t: any) => `  • ${t.date} ${t.test_name} (${t.exam_type}): ${t.scored_marks}/${t.max_marks} [P:${t.physics_marks} C:${t.chemistry_marks} M:${t.mathematics_marks}]`).join("\n");
      const taskList = (tasksRes.data || []).map((t: any) => `  • [${t.completed ? "✓" : " "}] ${t.title} (${t.type}${t.due_date ? `, due ${t.due_date}` : ""})`).join("\n");
      const chapters = (chaptersRes.data || []).map((c: any) => `  • ${c.jungle_id}/${c.chapter_id}: theory=${c.theory_done} practice=${c.practice_done} revision=${c.revision_done}`).join("\n");
      const journals = (journalRes.data || []).map((j: any) => `  • ${j.entry_date} mood=${j.mood ?? '-'}/10 [${(j.tags||[]).join(',')}]: ${String(j.content||'').slice(0,160)}`).join("\n");
      const pastChats = (recentChatsRes.data || []).reverse().map((c: any) => `  • ${c.role}: ${String(c.content||'').slice(0,200)}`).join("\n");
      const dJeeM = daysUntil(p?.exam_date_jee_main);
      const dJeeA = daysUntil(p?.exam_date_jee_advanced);
      const dCbse = daysUntil(p?.exam_date_cbse);
      const primaryDays = (studyTrack === 'neet' || studyTrack === 'jee') ? dJeeM : dCbse;
      const sundaysLeft = sundaysUntil(primaryDays);
      const effectiveDays = primaryDays != null ? Math.max(0, primaryDays - sundaysLeft) : null;

      memoryBlock = `## TIME CONTEXT (use this BEFORE making any plan)
Now (IST): ${istNow.toISOString().slice(0,16).replace('T',' ')} — ${dayNames[istDow]}${isWeekend ? ' (WEEKEND)' : ''}
Productive hours left TODAY: ~${hoursLeftToday}h (until 23:00 IST)
Days till JEE Main: ${dJeeM ?? '-'} | JEE Adv: ${dJeeA ?? '-'} | CBSE: ${dCbse ?? '-'}
Sundays/holidays in run-up to primary exam: ${sundaysLeft} (effective study days ≈ ${effectiveDays ?? '-'})
RULE: Never assign work that exceeds remaining hours today. Treat Sundays as half-load revision days. If <30 days to exam, switch from new chapters to revision + PYQ only.

## STUDENT PROFILE
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
      memoryBlock += `\n\n## JOURNAL / MOOD (last 7 entries)\n${journals || "  (no journal entries)"}\n\n## RECENT CHAT HISTORY (last 20 messages — reference these to feel continuous)\n${pastChats || "  (no prior chats)"}`;
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
