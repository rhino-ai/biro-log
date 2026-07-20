## Status vs. previous plan

**Done**
- Phase 1 chat backend: group invite-code trigger, creator auto-membership, secure `social-search` / `create-chat-group` / `invite-group-member` edge functions, rate-limited invite RPC.
- Phase 2 Friends UX: search by name/Biro-ID/invite/email, optimistic DM + group send, read receipts, realtime.
- Phase 3 Virtual Library: persistent rooms, room chat, timer, camera/mic/screen controls, **real peer-to-peer WebRTC calls** (mesh via Supabase realtime signaling, STUN).
- Push notifications (web + PWA) + 7 AM / 1 PM / 10 PM cron scheduler.
- Mentor / Biro-Yaar: memory, time-awareness, PDF + audio (ElevenLabs Scribe) + video keyframe understanding, thinking blocks, reply quoting.
- Chess: FEN undo history + force-AI move.
- Security: private avatars bucket, admin-code edge function, redacted email/phone columns, activity-log lockdown, revoked anon listing on chat-uploads.

**Remaining** (from the previous plan and follow-ups)
1. Media sharing in social chat (Friends DMs + groups can't upload images/files yet).
2. Invite links open a direct join flow (deep-link route `/join/:code`).
3. BYO AI keys (per-user Gemini/OpenAI key stored server-side, used by mentor when set).
4. OCR for screenshots into mentor memory.
5. Strict screen-time read-mode enforcement (block navigation past limit).
6. Full end-to-end QA sweep + bug fixes.

Skipping unless you ask: full Google-Sheets parity beyond current formulas/zoom/dup, human-level video scene analysis, true client-side E2EE.

## Execution order

### Step 1 — Chat media sharing
- Reuse `chat-uploads` bucket. Add `attachment_url` + `attachment_type` columns (or JSON `metadata`) on `direct_messages` and `group_messages`.
- Add image/file button in Friends chat composer using existing `ChatFileUpload` pattern.
- Render inline thumbnails / file cards in message list.

### Step 2 — Deep-link invite join
- Add route `/join/:code`.
- On mount: if signed in, call `join_group_by_invite` and redirect into the group; if guest, bounce through `/auth?next=/join/:code`.
- "Copy invite link" in group settings now yields `https://…/join/GRPXXXX`.

### Step 3 — BYO AI keys
- Table `user_api_keys(user_id, provider, key_ciphertext)` with RLS locked to owner + service_role.
- Edge function `save-user-api-key` (encrypt with `ADMIN_STEP_TWO`-style project secret via WebCrypto) and `get-user-api-key` used server-side only.
- `ai-mentor-chat` / `biro-yaar-chat`: if user has a Gemini key, call Gemini direct; else fall back to Lovable AI gateway.
- Profile page: "My AI Keys" section with add/rotate/remove.

### Step 4 — OCR into mentor memory
- Add optional Tesseract.js OCR in `ChatFileUpload` for image attachments; attach extracted text alongside the image so the mentor prompt sees it, and store it in `mentor_conversations.attachments`.

### Step 5 — Strict read-mode enforcement
- Add a `ReadModeGuard` provider that watches daily screen-time; when limit is breached and villain/read mode is on, redirect all non-essential routes to `/villain` and disable social/AI pages.

### Step 6 — QA sweep
- Two-account manual walk of: signup → task → mentor plan → group create → invite by link → DM with image → library video call → push receipt → chess undo → villain mode.
- Fix any regressions found; run `bunx tsgo --noEmit` and edge-function logs check.

I'll implement Step 1 first, ship it, then move to Step 2, etc. Each step is a small verifiable slice so you can test as we go.

## Technical notes

- All new tables get GRANTs + RLS + service_role access per project conventions.
- Storage: reuse existing `chat-uploads` bucket; signed URLs for private items.
- BYO keys: keys never returned to client; only used inside edge functions with `service_role`; decrypt in-function.
- WebRTC already uses public STUN; for cross-NAT reliability we can add a TURN provider later — flagged, not blocking.
