## Scope (from your answers)

1. **Real per-app screen time** — Android native + iOS shortcut
2. **Live-call indicator** — Android foreground-service notification + web system notification when tab hides
3. **Task UX** — faster add, drag-reorder + inline edit, prominent templates, weekly/monthly view, task reminders as push
4. **Message push** — only when app is closed/backgrounded

---

## 1. Screen Time (native + web fallback)

**Android (Capacitor plugin)**
- Add a small custom Capacitor plugin `UsageStatsPlugin` (Kotlin) exposing:
  - `hasPermission()` — checks `AppOpsManager` for `PACKAGE_USAGE_STATS`
  - `requestPermission()` — deep-links to `Settings.ACTION_USAGE_ACCESS_SETTINGS`
  - `getDailyUsage({ days })` — returns `[{ packageName, appName, minutes, date }]` via `UsageStatsManager.queryUsageStats`
- Update `ScreenTimePage.tsx`:
  - New "Real device usage" section (shown only when `Capacitor.isNativePlatform()` and platform is Android)
  - Big **"Grant Usage Access"** button → deep-link; live status pill (Granted / Not granted)
  - Once granted: replace the simulated `weekData` with real per-day totals, and list the top apps with real per-app minutes
- iOS: add an **"Open iOS Screen Time"** button that calls `App-Prefs:SCREEN_TIME` via `App.openUrl` (iOS blocks reading, so this just deep-links to Settings)
- Web/PWA: keep the existing in-app tracker but relabel it "In-app time" so it's not misleading

**Files**
- `android/app/src/main/java/app/lovable/.../UsageStatsPlugin.kt` (new)
- Register plugin in `MainActivity.java`
- `src/lib/usageStats.ts` — TS wrapper with web fallback
- `src/pages/ScreenTimePage.tsx` — new "Device Usage" section
- `ANDROID.md` — document the permission

---

## 2. Live-call indicator (foreground service + web notification)

**Android foreground service**
- Add `CallForegroundService` (Kotlin) that shows a persistent low-priority notification:
  - Title: "You are LIVE in <room name>"
  - Actions: `Return to room` (deep-links back), `Leave call`
  - Started when `liveCall.active` becomes true; stopped on `clear()`
- Small Capacitor plugin `LiveCallNotifier`: `start({ roomName, roomCode })`, `stop()`
- Manifest permissions: `FOREGROUND_SERVICE`, `POST_NOTIFICATIONS` (13+), `WAKE_LOCK`

**Web / PWA**
- In `LiveCallIndicator.tsx`, when the tab is hidden and a call is active, show a real **Notification API** notification (not just a toast) with the room name and a "Return" action that focuses the tab. Keep the current in-app red banner for when the tab is visible.

**Files**
- `src/components/system/LiveCallIndicator.tsx` — add Notification API branch, wire native start/stop
- `src/lib/liveCall.ts` — call `LiveCallNotifier.start/stop` in `set/clear`
- `android/.../CallForegroundService.kt`, `LiveCallNotifierPlugin.kt` (new)

---

## 3. Task system upgrade

- **Faster add**: one-line composer at the top of `TasksPage` (title only + Enter to save). Time / priority / templates collapse behind a "…" affordance.
- **Templates prominent**: pinned chip row above the composer with the top habit templates (Morning routine, Focus block, Revision, Sleep by 11) — one tap adds a full pre-filled task.
- **Drag reorder + inline edit**: `@dnd-kit/sortable` on the task list, tap-title-to-edit inline (no modal).
- **Weekly / Monthly views**: new tab switcher `Today | Week | Month`:
  - Week: 7-column grid grouped by day-of-week
  - Month: calendar grid with task dots per day and a bottom sheet on tap
  - Recurring tasks (`repeat: daily|weekly|monthly`) expand into the correct cells
- **Task reminders (push)**: add `remind_at TIMESTAMPTZ` column on `user_tasks`; `push-scheduler` picks up any task with `remind_at <= now() AND reminded_at IS NULL` and sends push via existing `send-push` pipeline; sets `reminded_at`.

**Files**
- `src/pages/TasksPage.tsx` — rewrite composer, add view switcher, dnd, inline edit
- `src/components/game/HabitTemplates.tsx` — expose a compact chip variant
- Migration: `ALTER TABLE user_tasks ADD COLUMN remind_at TIMESTAMPTZ, reminded_at TIMESTAMPTZ`
- `supabase/functions/push-scheduler/index.ts` — add task-reminder pass

---

## 4. Message push only when backgrounded

- Client sets an app-wide "app is focused" flag; `notify-chat` already fires on new messages — we gate delivery by checking that the recipient is not the active viewer of that chat (existing tracking in `chat_preferences.last_seen_at`) and only sends when `document.hidden` was the last state or `last_seen_at > 60s ago`.
- Simpler and reliable: in `notify-chat`, skip push if the recipient's `push_subscriptions.last_active_at` is within the last 30 seconds AND they are viewing the same chat (write `chat_preferences.viewing_chat_id` from the client while the chat is open, clear on unmount / blur).

**Files**
- Migration: `chat_preferences.viewing_chat_id UUID`, `push_subscriptions.last_active_at TIMESTAMPTZ`
- `src/hooks/useChatStorage.ts` — write/clear `viewing_chat_id`; heartbeat `last_active_at` every 20s while focused
- `supabase/functions/notify-chat/index.ts` — skip when actively viewing

---

## Order of execution

1. DB migration (task columns + chat presence columns) — needs your approval
2. Backend: `push-scheduler` task pass + `notify-chat` gating
3. Frontend: Tasks page rewrite (composer, dnd, week/month, reminders)
4. Live-call web Notification API branch + `ScreenTimePage` rename/relabel
5. Capacitor native plugins (UsageStats + LiveCallNotifier + foreground service) — you'll need to `git pull` + `npx cap sync` + rebuild the Android app for these to activate

---

## Caveats you should know

- **iOS screen time is unreadable** by any third-party app — Apple policy. Only the deep-link button is possible.
- **Android usage stats permission** requires the user to enable "Usage access" manually in system settings; it can't be granted from an in-app prompt.
- **Web PWA "You are LIVE" while tab is closed**: browsers freeze background JS. The Notification API fires at the moment of tab-hide; while fully closed, only the native Android build can keep the persistent alert.
- Native pieces (plugins, foreground service) will only run after you `git pull` → `npm install` → `npx cap sync android` → rebuild.