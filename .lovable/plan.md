# Biro-log Frontend Restructure Plan

Goal: reorganize the existing `src/` tree into the folder architecture you specified, while keeping every current feature (Home, Jungles, Raid, Tasks, Wellness, Social, Games, Mentor, AI, Virtual Library, Trackers, etc.) working exactly as it does today.

## Approach

This is a **structural refactor**, not a rewrite. No business logic, no UI redesign, no backend/DB changes. I will move files and update imports only. All existing pages, edge functions, RLS, and features stay intact.

To avoid breaking imports across ~120 files, I will keep the `@/` alias and do the move in safe phases, running the build after each phase.

## Target structure

```text
src/
├── assets/
├── components/
│   ├── common/       # BottomNav, Header (TopBar), BackButton, PushToggle, NavLink, ui/*
│   ├── cards/        # JungleCard, StatCard, TreeIcon, DailyGoalWidget, etc.
│   ├── game/         # kept (domain widgets: Avatar, XPBar, RaidBattle, ChapterList…)
│   ├── games/        # kept (Chess, PatternMemory, Stroop, etc.)
│   ├── chat/         # kept
│   ├── settings/     # kept
│   ├── spreadsheet/  # kept
│   ├── system/       # kept (ReadModeGuard, LiveCallIndicator, AccessDenied)
│   └── layouts/      # new MainAppLayout wrapping Header + <Outlet/> + BottomNav
├── context/          # re-exports AuthContext from hooks/useAuth, GlobalState from store/gameStore
├── features/
│   ├── study-room/   # extracted from VirtualLibraryPage + useWebRTCMesh + liveCall
│   ├── raid-boss/    # RaidBattle + raid selectors
│   ├── pomodoro/     # FocusTimer + villain-mode helpers
│   └── spaced-rep/   # RevisionScheduler algorithm (INTERVALS + urgency)
├── pages/
│   ├── Home/         # Index.tsx
│   ├── Games/        # MindGamesPage
│   ├── Wellness/     # WellnessPage, JournalPage, ScreenTimePage
│   ├── Tasks/        # TasksPage, RevisionSchedulerPage, RaidPage
│   ├── Social/       # FriendsPage, VirtualLibraryPage, LeaderboardPage, JoinInvitePage, DailyHotQuestionPage
│   └── Profile/      # ProfilePage, AnalyticsPage, FeedbackPage, GuidePage, AdminPage, TrackersPage, MentorPage, MentorTimelinePage, BiroYaarPage, JunglesPage, JungleDetailPage, VillainModePage, AuthPage, NotFound
├── hooks/            # kept
├── store/            # kept (gameStore is the GlobalState)
├── integrations/     # kept (supabase auto-gen — untouched)
├── lib/              # kept
├── utils/            # new: date/time helpers currently inlined, API helpers
└── App.tsx
```

Notes:
- `components/game/` and `components/games/` are kept as-is because splitting the 40+ domain widgets into `cards/common` cleanly would require touching every page. Only truly generic shell pieces move to `common/` and pure card widgets move to `cards/`.
- `context/` becomes a thin re-export layer so new code can `import { useAuth } from "@/context/AuthContext"` while existing `@/hooks/useAuth` keeps working.
- Auto-generated files (`src/integrations/supabase/client.ts`, `types.ts`) are never touched.

## Phases

1. **Scaffold** new dirs (`common`, `cards`, `layouts`, `context`, `features/*`, `utils`, `pages/<Group>/`) with barrel `index.ts` files.
2. **Move shell** components (Header→common/TopBar, BottomNav, BackButton, PushToggle, NavLink) and update the 6 pages that import them.
3. **Add `MainAppLayout`** and refactor `App.tsx` routes to use it (removes the repeated `<Header/><main>…</main><BottomNav/>` in every page).
4. **Group pages** into `pages/Home`, `pages/Tasks`, `pages/Social`, `pages/Wellness`, `pages/Games`, `pages/Profile`. Update imports in `App.tsx`.
5. **Extract features**: move WebRTC mesh + room UI to `features/study-room/`, revision INTERVALS/urgency to `features/spaced-rep/`, focus timer to `features/pomodoro/`, raid math to `features/raid-boss/`. Pages become thin wrappers.
6. **Context re-exports** for `AuthContext` and `GlobalState`.
7. **Build + smoke test** after each phase; fix any broken imports before moving on.

## Out of scope

- No visual redesign, no new features, no DB migrations, no edge-function changes.
- No changes to Lovable Cloud / Supabase config.
- No renaming of exported symbols (only file locations change).

## Risk

Medium — many import paths change. Mitigated by phased moves + build checks and by keeping the `@/` alias so most updates are one-line path edits.

Approve and I'll start with Phase 1.