import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SearchResult = {
  user_id: string;
  name: string;
  avatar: string | null;
  level: number | null;
  xp: number | null;
  unique_id: string | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in to search users." }, 401);

    const backend = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await backend.auth.getUser(token);
    const viewer = authData.user;
    if (authError || !viewer) return json({ error: "Please sign in to search users." }, 401);

    const { query } = await req.json().catch(() => ({}));
    const cleanQuery = String(query ?? "").trim();
    if (cleanQuery.length < 2) return json({ results: [] });
    if (cleanQuery.length > 120) return json({ error: "Search is too long." }, 400);

    const byIdOrName = backend
      .from("profiles")
      .select("user_id,name,avatar,level,xp,unique_id")
      .neq("user_id", viewer.id)
      .or(`name.ilike.%${escapeLike(cleanQuery)}%,unique_id.ilike.%${escapeLike(cleanQuery)}%,invite_code.eq.${cleanQuery.toUpperCase()}`)
      .limit(12);

    const queries = [byIdOrName];
    if (cleanQuery.includes("@")) {
      queries.push(
        backend
          .from("profiles")
          .select("user_id,name,avatar,level,xp,unique_id")
          .neq("user_id", viewer.id)
          .ilike("email", cleanQuery)
          .limit(3),
      );
    }

    const responses = await Promise.all(queries);
    const merged = new Map<string, SearchResult>();
    for (const response of responses) {
      if (response.error) throw response.error;
      for (const row of response.data ?? []) merged.set(row.user_id, row as SearchResult);
    }

    return json({ results: Array.from(merged.values()).slice(0, 12) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Search failed." }, 500);
  }
});