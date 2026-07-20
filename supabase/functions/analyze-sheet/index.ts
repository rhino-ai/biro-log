import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getUserApiKey } from "../_shared/user-keys.ts";

// Proxies Google Sheet CSV analysis through the server so the user's Gemini key never
// touches the browser. Uses the user's encrypted Gemini key if saved, otherwise
// falls back to the Lovable AI Gateway.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.slice(7);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sheetId: string = String(body?.sheetId || "").trim();
    if (!/^[-\w]{10,}$/.test(sheetId)) {
      return new Response(JSON.stringify({ error: "invalid sheetId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch CSV server-side
    const csvRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
    if (!csvRes.ok) {
      return new Response(JSON.stringify({ error: 'Sheet must be set to "Anyone with the link can view".' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const csvText = (await csvRes.text()).split("\n").slice(0, 50).join("\n");

    const prompt = `Analyze this CSV data from a student's tracking sheet:\n\n${csvText}\n\nReturn ONLY a JSON object (no markdown, no backticks) in this exact format:
{
  "summary": "2-3 short sentences of motivational feedback or insights.",
  "chartType": "bar",
  "dataLabel": "Score / Time",
  "chartData": [ { "name": "Item 1", "value": 85 } ]
}
chartType must be "bar" or "line". Max 10 items. Parse numbers cleanly.`;

    // 2. Try the user's encrypted Gemini key first
    const userGemini = await getUserApiKey(admin, user.id, "gemini");
    let rawText = "";

    if (userGemini) {
      const g = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": userGemini,
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );
      const gj = await g.json();
      rawText = gj?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // 3. Fallback: Lovable AI Gateway
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Error("No AI provider available");
      const g = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const gj = await g.json();
      rawText = gj?.choices?.[0]?.message?.content || "";
    }

    const clean = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return new Response(JSON.stringify({ error: "AI response was not valid JSON", raw: clean }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});