import { jwtVerify } from "jose";

import { WEBSITE_URL } from "@calcom/lib/constants";

/**
 * Verifies the signed TOTP JWT issued when redirecting OAuth→MFA users to the TOTP-only form.
 * Used to gate password bypass: only requests that followed the OAuth flow (with valid JWT in URL)
 * may skip password verification.
 */
export async function verifyTotpToken(
  email: string,
  token: string | undefined
): Promise<boolean> {
  if (!token?.trim()) return false;

  try {
    const secret = new TextEncoder().encode(process.env.CALENDSO_ENCRYPTION_KEY);
    const { payload } = await jwtVerify(token, secret, {
      issuer: WEBSITE_URL,
      audience: `${WEBSITE_URL}/auth/login`,
      algorithms: ["HS256"],
    });
    return (payload.email as string)?.toLowerCase() === email.toLowerCase();
  } catch {
    return false;
  }
}
