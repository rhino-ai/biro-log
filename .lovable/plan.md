# Fix sign-in and chat access

## Goal
Make Google and email sign-in reliable, and ensure personal chats, groups, mentor chat, and library chat immediately recognize the signed-in account.

## Changes
1. Fix guest/account state so a successful sign-in always exits guest mode.
2. Allow guest users to open the sign-in page instead of being redirected away from it.
3. Preserve and validate the requested destination, then return users to the chat they originally opened after Google or email sign-in.
4. Verify Google managed sign-in and email/password sign-in are enabled in Lovable Cloud.
5. Improve profile creation so simultaneous sign-in initialization cannot create duplicate-profile warnings.
6. Keep signed-in-only social chat protected while leaving the existing guest study-room experience intact.
7. Run focused browser checks for guest → sign-in navigation, authenticated chat access, and current build errors.

## Technical details
- Clear `biro_guest_mode` whenever an authenticated session is received.
- Change the public auth gate to redirect only authenticated accounts, not guests.
- Use a safe same-origin `next` path and persist it across Google OAuth completion.
- Use conflict-safe profile creation keyed by the account ID.
- The reported `src/lib/utils.ts` line 8 error is not present in the current file; the current build log is clean, but validation will check it again after edits.
