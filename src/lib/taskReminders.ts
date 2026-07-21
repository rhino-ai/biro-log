import { supabase } from '@/integrations/supabase/client';

// Push a lightweight row into user_tasks so the push-scheduler can fire
// a reminder notification at remind_at. This is separate from the local
// gameStore task list — it exists only for server-side scheduled pushes.
export async function scheduleReminder(opts: {
  title: string;
  remindAt: Date;
  jungleId: string;
  type?: 'daily' | 'weekly' | 'monthly' | 'custom';
}) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { error: new Error('Not signed in') };
  const row = {
    user_id: uid,
    title: opts.title.slice(0, 200),
    jungle_id: opts.jungleId,
    type: opts.type || 'custom',
    remind_at: opts.remindAt.toISOString(),
    completed: false,
  } as any;
  const { data, error } = await (supabase as any).from('user_tasks').insert(row).select('id').maybeSingle();
  return { error, id: data?.id as string | undefined };
}

export async function cancelReminder(taskId: string) {
  await (supabase as any).from('user_tasks').delete().eq('id', taskId);
}

export async function markCompleted(taskId: string) {
  await (supabase as any).from('user_tasks').update({ completed: true, reminded_at: new Date().toISOString() }).eq('id', taskId);
}