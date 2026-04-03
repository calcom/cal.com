export const ONBOARDING_EMBED_VERIFIED_COOKIE_NAME = "onboarding-embed-verified";
const MAX_AGE_SECONDS = 60 * 60;

const encoder = new TextEncoder();

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.CALENDSO_ENCRYPTION_KEY;
  if (!secret) throw new Error("CALENDSO_ENCRYPTION_KEY is not set");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return hexEncode(signature);
}

export async function buildOnboardingEmbedVerifiedCookie(
  origin: string
): Promise<{ name: string; value: string; maxAge: number }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${origin}:${timestamp}`;
  const signature = await sign(payload);
  return { name: ONBOARDING_EMBED_VERIFIED_COOKIE_NAME, value: `${payload}.${signature}`, maxAge: MAX_AGE_SECONDS };
}

export async function verifyOnboardingEmbedVerifiedCookie(
  cookieValue: string | undefined
): Promise<string | null> {
  if (!cookieValue) return null;

  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payload = cookieValue.slice(0, dotIndex);
  const providedSig = cookieValue.slice(dotIndex + 1);
  const expectedSig = await sign(payload);

  if (providedSig.length !== expectedSig.length) return null;

  let mismatch = 0;
  for (let i = 0; i < providedSig.length; i++) {
    mismatch |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  const colonIndex = payload.lastIndexOf(":");
  if (colonIndex === -1) return null;

  const origin = payload.slice(0, colonIndex);
  const timestamp = parseInt(payload.slice(colonIndex + 1), 10);
  if (isNaN(timestamp)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > MAX_AGE_SECONDS) return null;

  return origin;
}


