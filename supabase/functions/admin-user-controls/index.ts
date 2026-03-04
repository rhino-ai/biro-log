import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: authData } = await adminClient.auth.getUser(token);
    const caller = authData.user;

    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: roleRow } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { action, targetUserId } = await req.json();

    if (action === 'delete_user') {
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'targetUserId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (targetUserId === caller.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own admin account' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await adminClient.from('contacts').delete().or(`user_id.eq.${targetUserId},contact_user_id.eq.${targetUserId}`);
      await adminClient.from('direct_messages').delete().or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`);
      await adminClient.from('group_members').delete().eq('user_id', targetUserId);
      await adminClient.from('group_messages').delete().eq('sender_id', targetUserId);
      await adminClient.from('mind_game_scores').delete().eq('user_id', targetUserId);
      await adminClient.from('app_feedback').delete().eq('user_id', targetUserId);
      await adminClient.from('user_tasks').delete().eq('user_id', targetUserId);
      await adminClient.from('test_records').delete().eq('user_id', targetUserId);
      await adminClient.from('user_chapter_progress').delete().eq('user_id', targetUserId);
      await adminClient.from('activity_log').delete().eq('user_id', targetUserId);
      await adminClient.from('profiles').delete().eq('user_id', targetUserId);
      await adminClient.from('user_roles').delete().eq('user_id', targetUserId);

      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteAuthError) {
        return new Response(JSON.stringify({ error: deleteAuthError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
