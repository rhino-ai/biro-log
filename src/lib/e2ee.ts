// Client-side E2EE helpers for Biro chat DMs.
// Uses libsodium: X25519 sealed keys per user, XChaCha20-Poly1305-like `box` for
// message ciphertext, and secretbox for file bytes.
//
// Private keys live only in IndexedDB on the user's device. Server only ever
// sees ciphertext + nonces + public keys.
import _sodium from 'libsodium-wrappers-sumo';
import { supabase } from '@/integrations/supabase/client';

type Sodium = typeof _sodium;
let sodiumReady: Promise<Sodium> | null = null;
const getSodium = async (): Promise<Sodium> => {
  if (!sodiumReady) {
    sodiumReady = _sodium.ready.then(() => _sodium);
  }
  return sodiumReady;
};

const DB_NAME = 'biro-e2ee';
const STORE = 'keys';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key: string): Promise<any> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    tx.onsuccess = () => resolve(tx.result);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbSet(key: string, val: any): Promise<void> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key);
    tx.onsuccess = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export type Keypair = { publicKey: Uint8Array; privateKey: Uint8Array };

const peerCache = new Map<string, Uint8Array | null>();
const sharedCache = new Map<string, Uint8Array>();

/**
 * Load or create the user's device keypair. Public key is published to
 * `user_public_keys`. Private key stays in IndexedDB.
 */
export async function ensureKeypair(userId: string): Promise<Keypair> {
  const s = await getSodium();
  const stored = await idbGet(`priv-${userId}`);
  if (stored?.publicKey && stored?.privateKey) {
    // Best-effort: republish the public key if it went missing on the server.
    void publishPublicKey(userId, stored.publicKey as Uint8Array).catch(() => {});
    return stored as Keypair;
  }
  const kp = s.crypto_box_keypair();
  const pair: Keypair = { publicKey: kp.publicKey, privateKey: kp.privateKey };
  await idbSet(`priv-${userId}`, pair);
  await publishPublicKey(userId, pair.publicKey);
  return pair;
}

async function publishPublicKey(userId: string, pub: Uint8Array): Promise<void> {
  const s = await getSodium();
  const b64 = s.to_base64(pub, s.base64_variants.ORIGINAL);
  const client = supabase as any;
  await client.from('user_public_keys').upsert({ user_id: userId, public_key: b64 }, { onConflict: 'user_id' });
}

export async function fetchPeerPublicKey(peerId: string): Promise<Uint8Array | null> {
  if (peerCache.has(peerId)) return peerCache.get(peerId)!;
  const s = await getSodium();
  const client = supabase as any;
  const { data } = await client.from('user_public_keys').select('public_key').eq('user_id', peerId).maybeSingle();
  if (!data?.public_key) { peerCache.set(peerId, null); return null; }
  const pub = s.from_base64(data.public_key, s.base64_variants.ORIGINAL);
  peerCache.set(peerId, pub);
  return pub;
}

async function getSharedKey(myPriv: Uint8Array, peerPub: Uint8Array): Promise<Uint8Array> {
  const s = await getSodium();
  const k = s.to_base64(peerPub, s.base64_variants.ORIGINAL) + '|' + s.to_base64(myPriv.slice(0, 8), s.base64_variants.ORIGINAL);
  const cached = sharedCache.get(k);
  if (cached) return cached;
  const shared = s.crypto_box_beforenm(peerPub, myPriv);
  sharedCache.set(k, shared);
  return shared;
}

/** Encrypt a UTF-8 string with the shared DM key. Returns base64 ciphertext + nonce. */
export async function encryptText(text: string, shared: Uint8Array): Promise<{ ciphertext: string; nonce: string }> {
  const s = await getSodium();
  const nonce = s.randombytes_buf(s.crypto_box_NONCEBYTES);
  const ct = s.crypto_box_easy_afternm(s.from_string(text), nonce, shared);
  return {
    ciphertext: s.to_base64(ct, s.base64_variants.ORIGINAL),
    nonce: s.to_base64(nonce, s.base64_variants.ORIGINAL),
  };
}

export async function decryptText(ciphertext: string, nonce: string, shared: Uint8Array): Promise<string> {
  const s = await getSodium();
  const ct = s.from_base64(ciphertext, s.base64_variants.ORIGINAL);
  const n = s.from_base64(nonce, s.base64_variants.ORIGINAL);
  const pt = s.crypto_box_open_easy_afternm(ct, n, shared);
  return s.to_string(pt);
}

/** Encrypt file bytes with a fresh random symmetric key. Returns ciphertext bytes + key/nonce (b64). */
export async function encryptFile(bytes: Uint8Array): Promise<{ ciphertext: Uint8Array; fileKey: string; fileNonce: string }> {
  const s = await getSodium();
  const key = s.crypto_secretbox_keygen();
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const ct = s.crypto_secretbox_easy(bytes, nonce, key);
  return {
    ciphertext: ct,
    fileKey: s.to_base64(key, s.base64_variants.ORIGINAL),
    fileNonce: s.to_base64(nonce, s.base64_variants.ORIGINAL),
  };
}

export async function decryptFile(bytes: Uint8Array, fileKey: string, fileNonce: string): Promise<Uint8Array> {
  const s = await getSodium();
  const key = s.from_base64(fileKey, s.base64_variants.ORIGINAL);
  const nonce = s.from_base64(fileNonce, s.base64_variants.ORIGINAL);
  const pt = s.crypto_secretbox_open_easy(bytes, nonce, key);
  return pt;
}

/** Public convenience: build a shared key for a given peer. Returns null if peer has no key yet. */
export async function sharedKeyFor(userId: string, peerId: string): Promise<Uint8Array | null> {
  const me = await ensureKeypair(userId);
  const peerPub = await fetchPeerPublicKey(peerId);
  if (!peerPub) return null;
  return getSharedKey(me.privateKey, peerPub);
}

/** Export the private key as base64 for backup (called from a user-initiated action). */
export async function exportPrivateKey(userId: string): Promise<string | null> {
  const s = await getSodium();
  const stored = await idbGet(`priv-${userId}`);
  if (!stored?.privateKey) return null;
  return s.to_base64(stored.privateKey as Uint8Array, s.base64_variants.ORIGINAL);
}