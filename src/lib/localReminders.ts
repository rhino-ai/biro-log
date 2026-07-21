// Client-side reminder scheduler. Fires a browser notification at the exact
// remind_at time using setTimeout + the Service Worker (falls back to
// window.Notification). Persists queued reminders in localStorage so they
// survive reloads and are re-armed on next app open.

type Reminder = { id: string; title: string; body?: string; url?: string; at: number };

const KEY = 'biro-local-reminders';
const timers = new Map<string, number>();

function readAll(): Reminder[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function writeAll(list: Reminder[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

async function fire(r: Reminder) {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(r.title, {
        body: r.body || 'Task reminder',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `local-${r.id}`,
        data: { url: r.url || '/tasks' },
        requireInteraction: true,
      } as any);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(r.title, { body: r.body || 'Task reminder', icon: '/logo.png' });
    }
  } catch (e) { console.warn('local reminder fire failed', e); }
  // Remove after firing
  writeAll(readAll().filter(x => x.id !== r.id));
  timers.delete(r.id);
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const p = await Notification.requestPermission();
  return p === 'granted';
}

export function scheduleLocalReminder(r: Omit<Reminder, 'id'> & { id?: string }) {
  const id = r.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: Reminder = { id, title: r.title, body: r.body, url: r.url, at: r.at };
  const list = readAll().filter(x => x.id !== id);
  list.push(entry);
  writeAll(list);
  arm(entry);
  return id;
}

function arm(r: Reminder) {
  const delay = r.at - Date.now();
  if (delay <= 0) { void fire(r); return; }
  // setTimeout maxes out around 24.8 days — clamp
  const t = window.setTimeout(() => fire(r), Math.min(delay, 2_147_000_000));
  timers.set(r.id, t);
}

export function cancelLocalReminder(id: string) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  writeAll(readAll().filter(x => x.id !== id));
}

// Re-arm all pending reminders on app load / focus.
export function rearmAllLocalReminders() {
  // Clear old timers
  timers.forEach(t => clearTimeout(t));
  timers.clear();
  const list = readAll();
  const now = Date.now();
  const kept: Reminder[] = [];
  for (const r of list) {
    if (r.at <= now - 60_000) continue; // drop very stale (>1 min past)
    kept.push(r);
    arm(r);
  }
  writeAll(kept);
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => rearmAllLocalReminders());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') rearmAllLocalReminders();
  });
}