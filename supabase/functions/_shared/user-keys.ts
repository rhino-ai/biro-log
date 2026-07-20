// Shared AES-GCM crypto helpers for storing per-user API keys.
// Master key is derived from SUPABASE_SERVICE_ROLE_KEY (SHA-256 -> 32-byte key).
// This means only edge functions with the service role secret can decrypt.

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getMasterKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!secret) throw new Error("missing service role key");
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(`biro-user-key-v1:${secret}`));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptKey(plain: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  return { ciphertext: toB64(new Uint8Array(buf)), iv: toB64(iv) };
}

export async function decryptKey(ciphertext: string, ivB64: string): Promise<string> {
  const key = await getMasterKey();
  const iv = fromB64(ivB64);
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, fromB64(ciphertext));
  return dec.decode(buf);
}

/**
 * Fetch and decrypt the user's key for a provider. Returns null if not set or on any failure.
 * Requires a supabase client with service role privileges.
 */
export async function getUserApiKey(supabase: any, userId: string, provider: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("user_api_keys")
      .select("key_ciphertext,iv")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();
    if (error || !data) return null;
    return await decryptKey(data.key_ciphertext, data.iv);
  } catch {
    return null;
  }
}