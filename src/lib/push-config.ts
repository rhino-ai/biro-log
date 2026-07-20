// Web Push public VAPID key. Safe to expose publicly.
export const VAPID_PUBLIC_KEY =
  "BBpMRIm-6fT2lO2BS4KaQc3omjkhShLrgG9WUc6ZbKSXtJUQ82kP0Oqbr3-C0v9yEx7cTqQd5Ycu5s_EKP_nkCs";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}