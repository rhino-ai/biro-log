# Plan: True E2EE + Attachment Preview Panel + Locked Signed URLs

Four related pieces. Ship in this order so each step is verifiable.

## 1. True End-to-End Encryption (libsodium)

**Keys**
- On first sign-in per device, generate a libsodium `box` keypair (X25519). Private key stays in IndexedDB (never leaves device). Public key uploaded to a new `user_public_keys` table.
- Each 1:1 DM derives a shared symmetric key via `crypto_box_beforenm(peerPub, myPriv)`.
- Each group has a symmetric `group_key` (XChaCha20-Poly1305). When a member is added, an existing member wraps the group key with the new member's public key and writes it to `group_key_shares(group_id, user_id, wrapped_key, nonce)`. New joiners pull their wrapped copy and unwrap locally.

**Messages**
- Client encrypts message text with the shared/group key → stores `ciphertext` + `nonce` in `direct_messages.content` / `group_messages.content` (base64). Server never sees plaintext.
- Legacy plaintext rows stay readable; new rows are tagged `encryption_version=2`.

**Attachments (files encrypted before upload)**
- Client generates a random 32-byte file key + nonce, encrypts the file bytes with XChaCha20-Poly1305, uploads the ciphertext blob to `chat-uploads`.
- The file key + nonce + original filename/mime are encrypted with the chat's shared/group key and stored in the message row as `attachment_meta` (JSON, ciphertext).
- On receive, client fetches the ciphertext blob, decrypts in-memory, creates a `blob:` URL for `<img>/<video>/<audio>/<embed>`.

**What server sees**: only opaque ciphertext for messages and files. No admin, no DB dump, no leaked signed URL can decrypt without the recipient's device private key.

**Trade-offs (called out honestly)**
- Losing the device = losing message history unless the user exported/backed up their private key. Add a "Export encryption key" button in Profile.
- Push notification bodies stay generic ("New message") — content stays on device.
- OCR / mentor analysis of chat attachments won't work on E2EE chats (would need to decrypt server-side, defeating E2EE). Mentor uploads (separate flow) keep working as today.

## 2. Locked signed URLs

- Drop 365-day signed URLs. Add edge function `chat-file-url` that:
  - Verifies caller's JWT.
  - Checks caller is sender/recipient (DM) or member (group) of the message that references this path.
  - Returns a 60-second signed URL.
- Client requests a fresh URL right before render/download. Even a leaked URL dies in a minute.
- Combined with E2EE, the blob is also unreadable ciphertext even if downloaded.

## 3. Attachment preview side panel (WhatsApp/TG-style)

- New `AttachmentPreviewPanel` component: right-side drawer on desktop, bottom sheet on mobile.
- Opens automatically right after the user picks a file (before send), showing:
  - Image → full preview + caption field
  - Video → player + duration + caption
  - PDF → first-page thumbnail + filename + caption
  - Audio → waveform-ish bar + duration + caption
- Buttons: `Send`, `Cancel`, optional `Add another`. Enter-to-send.
- Also opens on tap of an existing attachment in the transcript for full-screen view + download.
- Wired into `FriendsPage.tsx` (both DMs and groups). Composer's paperclip triggers the panel instead of sending immediately.

## 4. Migration + rollout

- New tables: `user_public_keys`, `group_key_shares`. GRANTs + RLS.
- Non-breaking: old plaintext messages render as before. New sends are E2EE by default once both sides have public keys published.
- If a peer has no public key yet (never logged in on new client), fall back to plaintext with an in-UI warning "This chat is not end-to-end encrypted until <name> opens the app once."

## Technical notes

- Library: `libsodium-wrappers-sumo` (~200KB gz, loads lazily on first chat open).
- Storage: private key in IndexedDB under `biro-e2ee/priv-<userId>`.
- Attachments still go to existing `chat-uploads` bucket, just as ciphertext blobs (`.enc` suffix).
- `attachment_meta` schema: `{ v: 2, path, mime, name, size, keyCipher, keyNonce, fileNonce }`.
- All crypto happens in a small `src/lib/e2ee.ts` module with unit-tested `encryptText/decryptText/encryptFile/decryptFile` helpers.
- Backward compat: if `encryption_version` missing/1, render as plaintext (current behavior).

This is ~1 focused build. I'll implement in the order above, verifying each slice before moving on. Approve and I'll start with the crypto module + key publishing, then wire it into DMs, then groups, then the preview panel and locked URLs.
