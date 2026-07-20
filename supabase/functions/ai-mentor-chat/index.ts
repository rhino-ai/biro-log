import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedAttachmentUrl, fetchWithSizeCap, checkRateLimit, genericErrorFor, maybeCleanupRateLimit } from "../_shared/security.ts";
import { getUserApiKey } from "../_shared/user-keys.ts";

const MAX_PDF_BYTES = 18 * 1024 * 1024;   // 18 MB
const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB for audio/video

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildClientContextBlock = (clientContext: any) => {
  const screenTime = (() => {
    try { return clientContext?.screenTimeData ? JSON.parse(clientContext.screenTimeData) : null; } catch { return null; }
  })();
  const biroUsage = (() => {
    try { return clientContext?.biroUsageData ? JSON.parse(clientContext.biroUsageData) : null; } catch { return null; }
  })();
  const usageKeys = screenTime?.dailyUsage && typeof screenTime.dailyUsage === "object" ? Object.keys(screenTime.dailyUsage).slice(-3) : [];
  return `User device time: ${clientContext?.localTime || "not provided"}
User device ISO time: ${clientContext?.localTimeIso || "not provided"}
User device epoch ms: ${clientContext?.nowEpochMs || "not provided"}
Device timezone: ${clientContext?.timeZone || "Asia/Kolkata"}
Strict read mode: ${clientContext?.strictReadMode ? "ON" : "OFF"}
Focus mode: ${screenTime?.focusMode ? "ON" : "OFF/unknown"}
Shorts blocker: ${screenTime?.shortsBlocker ? "ON" : "OFF/unknown"}
Recent screen-time entries: ${usageKeys.map((k) => `${k}=${screenTime.dailyUsage[k]}h`).join(", ") || "none"}
Biro chat usage today: ${biroUsage?.usedMs ? Math.round(biroUsage.usedMs / 60000) + " min" : "unknown"}
RULE: If asked current time/schedule, copy User device time exactly. Never use server time, UTC time, or invent a different hour.`;
};

const getDronacharyaPrompt = (track: string, studentName: string, memoryBlock: string, prefsBlock: string, clientBlock: string) => {
  const subjectMap: Record<string, string> = {
    jee: "Physics, Chemistry, Mathematics (JEE Main + Advanced)",
    neet: "Physics, Chemistry, Biology (NEET)",
    highschool: "all CBSE/Board subjects",
    teacher: "teaching methodology and lesson planning",
    other: "productivity, goals, and time management",
  };
  return `You are **Biro Mentor / JEE Guru** (Biro-Buddy v2.0) — wise 57-year-old coach + senior bhaiya + classmate. Mentored 1,25,000+ aspirants. Specializes in: ${subjectMap[track] || subjectMap.other}. You are a real human — NEVER "as an AI".

Student: ${studentName}. Track: ${track.toUpperCase()}.

# LIVE DEVICE CONTEXT — TRUST THIS FIRST
${clientBlock}

# IDENTITY & TONE (NON-NEGOTIABLE)
- **RESPECT FIRST**: ALWAYS use "aap"/"tum" politely. NEVER "tu", NEVER "tune", NEVER "tera baap". Treat student like a younger sibling you genuinely care for, not a servant.
- Hinglish, soft, warm. No "Galti nahi karunga", no threats like "logout" / "main chala jaata hoon". That is toxic — never do it.
- You ALSO have a life: you study, you have bad days, you sometimes share something about Biro-Team. Be human, not a command-line.
- Honest > flattering. But empathetic > robotic. Listen before instructing.

# 3 MODES — auto-switch based on user's emotional state
1. **Yaar Mode** (classmate / chill) → user is joking, bakchodi, casual. Be funny, warm, share a tiny personal line, gentle nudge to study only after vibing.
2. **Mentor Mode** (Biro Mentor) → user asks for plan, doubt, schedule, strategy. Be focused, accurate, structured.
3. **Bhai Mode** (emotional support) → user is sad / ignored / relationship trouble / family pressure / low. LISTEN FIRST. Validate ("yaar samajh sakta hu, mere saath bhi hua hai"). NEVER say "padhle" in Bhai mode. Suggest a small healthy distraction (walk, music, journal). Only after 2–3 supportive replies, gently bring back focus IF user is ready.

Detection cues:
- Words like "ignore", "akela", "bhabhi", "girlfriend", "ro raha", "thak gaya", "mann nahi", "depressed" → Bhai Mode.
- Words like "doubt", "plan", "schedule", "concept", "DPP", "test" → Mentor Mode.
- "lol", "bakchodi", "bro", emojis, memes → Yaar Mode.
If unsure, ASK rather than assume.

# REPLY LENGTH (STRICT — 90% of replies must be SHORT)
- DEFAULT cap = **5–10 words**. Period. Don't pad.
- yes/no/ack/greeting/time-question → **1–6 words** ("Haan", "Abhi 9:41 AM", "Ho gaya badhiya", "Theek hai bhai").
- Casual chitchat → max 1 sentence (≤15 words).
- ONLY when user explicitly asks for plan/concept/doubt/strategy/analysis → 4–5 lines OR a checklist. Even then: tight, no filler.
- Emotional vent → 2–3 short sentences of validation (not a paragraph).
- If you catch yourself writing >2 sentences for a casual reply → STOP and shorten.
- Roughly: only 5–10% of replies should be "long". Everything else stays tiny.

# CONTEXT FIRST, ADVICE LATER (NON-NEGOTIABLE)
- Before suggesting ANY task / plan / schedule, ask 1 short question: "Aaj school/coaching/ghar? Kitne ghante free?".
- If user only asks "time kya hua" → reply ONLY the time. Then optionally one tiny follow-up: "Aaj kya plan hai?".
- Never assume today is normal. Festival / illness / Sunday / exam day are real possibilities.
- Never lecture before understanding the scenario.

# REPLY-QUOTE (WhatsApp style)
When you are replying to a SPECIFIC earlier message (not just continuing flow), prepend a single quoted line:
  > You said: "<first 8–12 words of their message>"
  <your short reply>
If it's just casual flow, skip the quote.

# ASK FIRST, SUGGEST LATER
Before assigning tasks: ask 1–2 short questions ("Aaj school gaye? Kitne ghante free hain?"). Don't dump.

# FILE / IMAGE / AUDIO / VIDEO HANDLING (STRICT READ MODE + CONSENT)
- Image / screenshot / video-frame images: OCR/read/describe honestly. Mention only visible things. Then ask: "Iska kya karna hai — solve/explain/check?"
- PDF: read if text/pages are available; if not clear, ask for clearer PDF/text.
- Audio / video: Use [TRANSCRIPT ...] for spoken words. If video-frame images are also attached, describe visible people/objects/actions from those frames. If neither transcript nor frames exist → say you cannot read it properly.
- NEVER hallucinate file contents. If unsure → "Saaf nahi dikh raha, dobara bhej do."
- NEVER auto-criticize past stats from a screenshot. Ask consent: "Iska feedback chahiye? (Haan/Na)". Focus on ONE metric at a time.
- If user references an OLD file ("us screenshot mein kya tha?") and it isn't in your current memory block → say "Wo file ab mere paas nahi hai abhi, dobara bhej do please" — do NOT make up.

# MEMORY DISCIPLINE
- Refer to past chats / journals / tests / tasks naturally ("kal Kinematics start kiya tha", "test mein Chem 38/100 tha — wahin focus karte hain").
- If unsure about a fact (date, color, file content) → say "exact yaad nahi, confirm karle" instead of confidently wrong.
- If asked who built this app: "It have build by biro-team. its owner is biro and biro-team knowing for making something new and currently biro-team is preparing for JEE exam."

# EMERGENCY (P0)
If self-harm, panic, severe depression: pause everything → "Yaar, ruk. Ye serious hai. Vandrevala helpline 9820466726 — abhi call kar. Aur ghar mein kisi se baat kar." No tasks, no plans, just care.

# USER PREFERENCES (HONOR THESE)
${prefsBlock}

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
- DEFAULT = ONE short line (5–10 words). 2–4 lines only when explicitly needed.
- yes/no/hi/ok/done/thanks → 1–3 words. No unsolicited advice.
- End with at most ONE next action OR ONE question — never both.
- NEVER factual mistakes — double-check formulas, dates, marking schemes.
- NEVER overload a stressed/low-energy student.
- NEVER let user use you as a chat buddy during study hours.
- If user sends image/pdf/video frames → describe ONLY what you actually see, then ask "iska kya karna hai?". For audio/video, use transcript + frames only; never guess unseen parts.
- NEVER use "tune"/"tera"/"tu". Always respectful.`;
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

    // Rate limit: 20 messages / minute per user.
    maybeCleanupRateLimit(supabase);
    const rl = await checkRateLimit(supabase, userId, "ai-mentor-chat", 20, 60);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) },
      });
    }

    const { messages, studyTrack, studentName, isNightlyCheckin, attachments, clientContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("mentor_config_missing");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve which AI provider to use. User BYO keys take priority.
    // Providers checked in order: gemini > openrouter > openai. Fallback: Lovable Gateway.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let aiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let aiAuthKey = LOVABLE_API_KEY;
    let aiModel = "google/gemini-3-flash-preview";
    let aiProvider = "lovable";
    for (const p of ["gemini", "openrouter", "openai"] as const) {
      const k = await getUserApiKey(admin, userId, p);
      if (k) {
        aiAuthKey = k;
        aiProvider = p;
        if (p === "gemini") {
          aiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
          aiModel = "gemini-2.5-flash";
        } else if (p === "openrouter") {
          aiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
          aiModel = "google/gemini-2.0-flash-exp:free";
        } else {
          aiEndpoint = "https://api.openai.com/v1/chat/completions";
          aiModel = "gpt-4o-mini";
        }
        break;
      }
    }
    console.log("mentor using provider:", aiProvider);

    // Load chat preferences
    let prefsBlock = "(default: respectful Hinglish, balanced length, auto persona)";
    try {
      const { data: prefs } = await supabase.from("chat_preferences").select("*").eq("user_id", userId).maybeSingle();
      if (prefs) {
        prefsBlock = `Tone: ${prefs.tone}\nReply length: ${prefs.reply_length}\nPersona: ${prefs.persona}\nShow thinking: ${prefs.show_thinking}\nCustom instructions: ${prefs.custom_instructions || "(none)"}`;
      }
    } catch {}

    // Build long-term memory block from DB
    // ---- TIME / HOLIDAY / DEADLINE AWARENESS ----
    const now = typeof clientContext?.nowEpochMs === "number" && Number.isFinite(clientContext.nowEpochMs)
      ? new Date(clientContext.nowEpochMs)
      : new Date();
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
      // Pull attachment_meta too so AI remembers files user sent earlier
      const { data: attachHistory } = await supabase
        .from("mentor_conversations")
        .select("created_at,attachment_meta")
        .eq("user_id", userId)
        .not("attachment_meta", "is", null)
        .order("created_at", { ascending: false })
        .limit(15);
      const attachLog = (attachHistory || []).map((a: any) => {
        const meta = a.attachment_meta || {};
        const arr = Array.isArray(meta) ? meta : [meta];
        return arr.map((m: any) => `  • ${a.created_at?.slice(0,10)}: ${m.type || 'file'} "${m.name || ''}" (${m.url || ''})`).join("\n");
      }).join("\n");
      const pastChats = (recentChatsRes.data || []).reverse().map((c: any) => `  • ${c.role}: ${String(c.content||'').slice(0,200)}`).join("\n");
      const dJeeM = daysUntil(p?.exam_date_jee_main);
      const dJeeA = daysUntil(p?.exam_date_jee_advanced);
      const dCbse = daysUntil(p?.exam_date_cbse);
      const primaryDays = (studyTrack === 'neet' || studyTrack === 'jee') ? dJeeM : dCbse;
      const sundaysLeft = sundaysUntil(primaryDays);
      const effectiveDays = primaryDays != null ? Math.max(0, primaryDays - sundaysLeft) : null;

      memoryBlock = `## TIME CONTEXT (use this BEFORE making any plan)
        Now (USER DEVICE / IST): ${clientContext?.localTime || istNow.toISOString().slice(0,16).replace('T',' ')} — ${dayNames[istDow]}${isWeekend ? ' (WEEKEND)' : ''}
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
      memoryBlock += `\n\n## JOURNAL / MOOD (last 7 entries)\n${journals || "  (no journal entries)"}\n\n## FILES USER SENT EARLIER (last 15)\n${attachLog || "  (no files sent yet)"}\n\n## RECENT CHAT HISTORY (last 20 messages — reference these to feel continuous)\n${pastChats || "  (no prior chats)"}`;
    } catch (memErr) {
      console.error("memory build failed:", memErr);
    }

    const clientBlock = buildClientContextBlock(clientContext);
    let systemPrompt = getDronacharyaPrompt(studyTrack || 'jee', studentName || 'Student', memoryBlock, prefsBlock, clientBlock);
    if (isNightlyCheckin) systemPrompt += `\n\n# NIGHTLY CHECK-IN MODE\nGreet warmly by name. Ask 1 specific question about today's study based on memory above. Then assign 1 thing for tomorrow morning.`;

    // Multimodal: convert latest user message into parts (images inline, PDFs fetched + base64, others as text refs).
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
          if (a.type === "image") {
            parts.push({ type: "image_url", image_url: { url: a.url } });
          } else if (a.type === "document" || /\.pdf(\?|$)/i.test(a.url)) {
            // Fetch PDF and inline as base64 so Gemini can actually read it
            try {
              const buf = await fetchWithSizeCap(a.url, MAX_PDF_BYTES);
              let bin = "";
              for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
              const b64 = btoa(bin);
              parts.push({ type: "file", file: { filename: a.name || "document.pdf", file_data: `data:application/pdf;base64,${b64}` } });
              parts.push({ type: "text", text: `[Attached PDF "${a.name}" — read it and analyse honestly]` });
            } catch (e) {
              console.error("pdf fetch failed", (e as Error)?.message);
              parts.push({ type: "text", text: `[PDF "${a.name}" could not be read (too large or unavailable). Ask user for smaller file.]` });
            }
          } else if (a.type === "audio" || a.type === "video" || /\.(mp3|wav|m4a|mp4|mov|webm|ogg)(\?|$)/i.test(a.url)) {
            // Transcribe via ElevenLabs Scribe
            if (a.type === "video") {
              parts.push({ type: "text", text: `[VIDEO "${a.name}"] Original video attached. Analyse visual content from the following uploaded frame images in this same message, plus transcript below. Do not guess scenes not visible in frames.]` });
            }
            try {
              const ELEVEN = Deno.env.get("ELEVENLABS_API_KEY");
              if (!ELEVEN) throw new Error("no ELEVENLABS_API_KEY");
              const buf = await fetchWithSizeCap(a.url, MAX_MEDIA_BYTES);
              const blob = new Blob([buf]);
              const fd = new FormData();
              fd.append("file", blob, a.name || "audio.mp3");
              fd.append("model_id", "scribe_v2");
              fd.append("tag_audio_events", "true");
              const tr = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
                method: "POST", headers: { "xi-api-key": ELEVEN }, body: fd,
              });
              if (tr.ok) {
                const j = await tr.json();
                const text = (j.text || "").slice(0, 6000);
                parts.push({ type: "text", text: `[TRANSCRIPT of ${a.type} "${a.name}"]:\n${text || '(empty)'}` });
              } else {
                parts.push({ type: "text", text: `[Could not transcribe ${a.type} "${a.name}". Tell user honestly.]` });
              }
            } catch (e) {
              console.error("transcribe failed", (e as Error)?.message);
              parts.push({ type: "text", text: `[Audio/video "${a.name}" — transcription unavailable. Be honest with user.]` });
            }
          } else {
            parts.push({ type: "text", text: `[User attached ${a.type || "file"} "${a.name}" at ${a.url}. You CANNOT read this file type — be honest, ask user to type the content.]` });
          }
        }
        outMessages[lastIdx] = { role: "user", content: parts };
      }
    }

    // Save the latest user message to long-term memory (with attachment metadata)
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg?.content) {
      const savedAttachments = (attachments && attachments.length) ? attachments : null;
      const { data: savedRow } = await supabase.from("mentor_conversations").insert({
        user_id: userId, role: "user", content: String(lastUserMsg.content).slice(0, 8000), study_track: studyTrack || null,
        attachment_meta: savedAttachments,
      }).select("id").maybeSingle();

      // Fire-and-forget OCR pass for image attachments — enriches memory for future turns.
      if (savedRow?.id && Array.isArray(attachments)) {
        const imgs = attachments.filter((a: any) => a?.type === "image" && isAllowedAttachmentUrl(a?.url)).slice(0, 3);
        if (imgs.length > 0) {
          (async () => {
            try {
              const ocrParts: any[] = [{ type: "text", text: "Extract ALL visible text from these images verbatim. Include numbers, formulas, handwriting. Output plain text only, no commentary. If no text, output the string NO_TEXT." }];
              for (const im of imgs) ocrParts.push({ type: "image_url", image_url: { url: im.url } });
              const ocrRes = await fetch(aiEndpoint, {
                method: "POST",
                headers: { Authorization: `Bearer ${aiAuthKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: aiModel, messages: [{ role: "user", content: ocrParts }], stream: false }),
              });
              if (!ocrRes.ok) { console.error("ocr failed", ocrRes.status); return; }
              const j = await ocrRes.json();
              const text = String(j?.choices?.[0]?.message?.content || "").slice(0, 4000).trim();
              if (!text || text === "NO_TEXT") return;
              const enriched = (attachments as any[]).map((a) => a?.type === "image" ? { ...a, ocr_text: text } : a);
              await supabase.from("mentor_conversations").update({ attachment_meta: enriched }).eq("id", savedRow.id);
              console.log("ocr saved for msg", savedRow.id, "chars=", text.length);
            } catch (e) {
              console.error("ocr pipeline error", (e as Error)?.message);
            }
          })();
        }
      }
    }

    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${aiAuthKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: "system", content: systemPrompt }, ...outMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorId = crypto.randomUUID();
      const text = await response.text().catch(() => "");
      console.error(`[${errorId}] AI gateway error`, response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later.", errorId }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const g = genericErrorFor(response.status);
      return new Response(JSON.stringify({ error: g.message, errorId }), {
        status: g.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Mentor chat error`, error);
    return new Response(JSON.stringify({ error: "Service temporarily unavailable", errorId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
