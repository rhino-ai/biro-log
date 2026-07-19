## What I verified

- The current Friends page uses real backend tables for DMs, groups, members, and group messages.
- Real-time is enabled for the chat message/group tables.
- There is a likely blocker for group invites: the database has an invite-code generator function, but no active trigger is attached to `chat_groups`, so newly created groups can end up with no usable invite code.
- User search is incomplete: the main chat dialog only searches name and Biro ID, while the invite tab tries to search email directly even though email is protected and should not be exposed to normal client queries.
- The Virtual Library is currently a presence-based study room only. It shows labels like video calling, screen share, and E2E, but those are not implemented end-to-end yet.

## Remaining features not fully end-to-end yet

1. **Chat system**
   - DMs exist, but UX needs reliable send/receive confirmation, optimistic messages, error states, and read status.
   - Group creation needs guaranteed invite codes and automatic creator membership.
   - Search needs username, Biro ID, invite code, and safe email-based lookup.
   - Invite links should open directly into add/join flows.
   - Media sharing in social chat is not end-to-end in the Friends page.
   - True client-side E2EE is not implemented; current system is transport encryption + backend row security.

2. **Virtual Library**
   - Current room system only tracks online members.
   - Real video calling, mic/camera controls, screen sharing, room chat, and study-room invite links are not implemented end-to-end.
   - Shared notes and room persistence are not implemented.

3. **Other previously requested big features still needing dedicated build passes**
   - Push notifications for web/app.
   - OTP-style flows beyond normal auth.
   - Strict screen-time enforcement/read mode.
   - User-provided AI keys for Gemini/OpenAI with secure backend-only storage.
   - Full Google-Sheets-grade clone parity beyond current formulas/zoom basics.
   - Full video understanding like human-level scene/logos/person/action analysis.
   - Full mentor task planning tied to every task/wellness/screen-time signal with QA scenarios.

## Execution plan

### Phase 1: Fix real chat and group creation

- Add a backend migration that:
  - Attaches the existing group invite-code trigger to `chat_groups`.
  - Adds missing safeguards so every group gets a unique `GRP...` invite code.
  - Ensures the creator can reliably become the first group admin/member.
  - Adds or fixes indexes for fast chat loading and search.
  - Keeps profile email protected while enabling safe lookup by exact email.

- Add secure backend functions for:
  - Searching users by Biro ID, username/name, invite code, and exact email.
  - Creating a group and adding the creator in one backend-safe operation.
  - Inviting/adding a user to a group by user ID or exact email without exposing email data.

### Phase 2: Upgrade Friends page UX

- Replace direct profile email search with the safe backend search function.
- Show search results with name, avatar, Biro ID, level, and action buttons.
- Add flows:
  - Start DM from user search.
  - Add contact by ID/name/invite code/email.
  - Create group with name/icon.
  - Copy group invite code/link.
  - Join group from code/link.
  - Invite selected users/email matches to a group.
- Improve message UX:
  - Optimistic message bubble immediately after send.
  - Clear failed-send toast if backend rejects it.
  - Auto-scroll reliably.
  - Mark received DM messages as read.
  - Show loading/empty/error states.

### Phase 3: Make Virtual Library real enough for first working version

- Add persisted study rooms in the backend with room code, owner, title, and member list.
- Upgrade the Virtual Library UI from “presence only” to:
  - Create/join room by code/link.
  - Live member list.
  - Built-in room text chat.
  - Study timer per room.
  - Camera/mic preview controls using browser media APIs.
  - Screen-share button using browser screen capture.
- Important limitation: true multi-user video calling needs WebRTC signaling/TURN infrastructure. I’ll implement the browser media controls and room/signaling foundation first; if TURN/server relay is needed for reliable calls across all networks, I’ll flag that as the next backend integration step instead of falsely labeling it complete.

### Phase 4: QA and verification

- Test with the current preview session:
  - Friends page loads without errors.
  - Search works by name/Biro ID/invite code/email exact match.
  - DM can be created and a message insert succeeds.
  - Group creation returns a usable invite code.
  - Invite-code join endpoint works.
  - Virtual Library room create/join flow works.
- Run typecheck after code changes.
- Check backend logs/function errors for the affected endpoints.

## Security stance

- Real chat features will require signed-in users. Guest mode cannot safely send real backend messages because there is no verified user identity.
- Email lookup will not expose other users’ email addresses; it will only use exact email matching to find the safe public profile fields needed for invite/contact actions.
- I will not claim true WhatsApp-style client-side E2EE unless we build actual client key generation/encryption/decryption and accept the tradeoff that AI/search/moderation cannot read encrypted message bodies.