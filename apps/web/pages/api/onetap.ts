import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

const ALLOWED_ORIGINS = (process.env.ONE_TAP_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

type OneTapSuccessResponse = {
  ok: true;
  redirectUrl: string;
};

type OneTapErrorResponse = {
  ok: false;
  error: string;
  redirectUrl?: string;
};

type OneTapResponse = OneTapSuccessResponse | OneTapErrorResponse;

const NEXTAUTH_ERROR_MAP: Record<string, string> = {
  CredentialsSignin: "auth-failed",
  "unverified-email": "unverified-email",
  "new-email-conflict": "new-email-conflict",
  "user-creation-error": "user-creation-error",
  "wrong-provider": "wrong-provider",
  UserNotFound: "user-not-found",
  SecondFactorRequired: "two-factor-required",
};

function setCORSHeaders(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin);

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
  }

  return allowed;
}

function forwardCookies(source: Response, target: NextApiResponse): void {
  const raw: string[] =
    typeof (source.headers as any).getSetCookie === "function"
      ? (source.headers as any).getSetCookie()
      : ([source.headers.get("set-cookie")].filter(Boolean) as string[]);

  if (raw.length > 0) {
    target.setHeader("Set-Cookie", raw);
  }
}

function extractNextAuthError(location: string, baseUrl: string): string | null {
  try {
    const url = new URL(location, baseUrl);
    const error = url.searchParams.get("error");
    if (!error) return null;
    const base = error.split("&")[0];
    return NEXTAUTH_ERROR_MAP[base] ?? base;
  } catch {
    return null;
  }
}

function extractCookieValue(setCookieHeader: string): string {
  return setCookieHeader.split(";")[0].trim();
}

function isSameOrigin(url: string, baseUrl: string): boolean {
  try {
    const target = new URL(url);
    const base = new URL(baseUrl);
    return target.origin === base.origin;
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OneTapResponse>
): Promise<void> {
  const originAllowed = setCORSHeaders(req, res);

  if (req.method === "OPTIONS") {
    return void res.status(200).end();
  }

  if (!originAllowed) {
    return void res.status(403).json({ ok: false, error: "Origin not allowed" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return void res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { credential } = req.body as { credential?: unknown };

  if (!credential || typeof credential !== "string" || credential.trim() === "") {
    return void res.status(400).json({ ok: false, error: "Missing or invalid credential" });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "";

  const useSecureCookies = baseUrl.startsWith("https://");
  const csrfCookieName = useSecureCookies ? "__Secure-next-auth.csrf-token" : "next-auth.csrf-token";

  const browserCookiesWithoutCsrf = (req.headers.cookie ?? "")
    .split(";")
    .map((c) => c.trim())
    .filter((c) => !c.startsWith(`${csrfCookieName}=`))
    .join("; ");

  let csrfToken: string;
  let freshCsrfCookieValue: string;

  try {
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, {
      headers: {
        cookie: browserCookiesWithoutCsrf,
      },
    });

    if (!csrfRes.ok) {
      throw new Error(`CSRF endpoint returned HTTP ${csrfRes.status}`);
    }

    const body = (await csrfRes.json()) as { csrfToken?: string };

    if (!body.csrfToken) {
      throw new Error("CSRF response missing csrfToken field");
    }

    csrfToken = body.csrfToken;

    const rawCsrfSetCookie = csrfRes.headers.get("set-cookie") ?? "";
    if (!rawCsrfSetCookie) {
      throw new Error("CSRF response missing Set-Cookie header");
    }
    freshCsrfCookieValue = extractCookieValue(rawCsrfSetCookie);
  } catch (err) {
    console.error("[google-one-tap] Failed to fetch CSRF token:", err);
    return void res.status(500).json({ ok: false, error: "Could not obtain CSRF token" });
  }

  const cookieHeader = [browserCookiesWithoutCsrf, freshCsrfCookieValue]
    .filter(Boolean)
    .join("; ");

  let callbackRes: Response;
  try {
    callbackRes = await fetch(`${baseUrl}/api/auth/callback/google-one-tap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: cookieHeader,
      },
      body: new URLSearchParams({
        csrfToken,
        credential,
        json: "true",
      }),
    });
  } catch (err) {
    console.error("[google-one-tap] NextAuth callback request failed:", err);
    return void res.status(502).json({ ok: false, error: "Auth service unreachable" });
  }

  let nextAuthBody: { url?: string; error?: string };
  try {
    nextAuthBody = await callbackRes.json();
  } catch (err) {
    console.error("[google-one-tap] Failed to parse NextAuth response body:", err);
    return void res.status(500).json({ ok: false, error: "Unexpected response from auth service" });
  }

  const { url: callbackUrl = "", error: callbackError } = nextAuthBody;

  console.log("[google-one-tap] NextAuth response:", {
    status: callbackRes.status,
    callbackUrl,
    callbackError,
  });

  if (callbackUrl.includes("csrf=true")) {
    console.error("[google-one-tap] CSRF validation failed — cookie/token mismatch");
    return void res.status(500).json({ ok: false, error: "CSRF validation failed" });
  }

  if (callbackError || callbackUrl.includes("error=") || callbackUrl.includes("/auth/error")) {
    const errorCode = callbackError
      ? NEXTAUTH_ERROR_MAP[callbackError] ?? callbackError
      : extractNextAuthError(callbackUrl, baseUrl);
    return void res.status(401).json({
      ok: false,
      error: errorCode ?? "auth-failed",
    });
  }

  if (callbackUrl.includes("/auth/login") && callbackUrl.includes("totp=true")) {
    forwardCookies(callbackRes, res);
    const absoluteUrl = callbackUrl.startsWith("http") ? callbackUrl : `${baseUrl}${callbackUrl}`;
    if (!isSameOrigin(absoluteUrl, baseUrl)) {
      console.error("[google-one-tap] Rejected non-same-origin TOTP redirect:", absoluteUrl);
      return void res.status(400).json({ ok: false, error: "Invalid redirect" });
    }
    return void res.status(200).json({
      ok: false,
      error: "two-factor-required",
      redirectUrl: absoluteUrl,
    });
  }

  if (callbackUrl.includes("/auth/locked")) {
    forwardCookies(callbackRes, res);
    return void res.status(403).json({
      ok: false,
      error: "account-locked",
      redirectUrl: `${baseUrl}/auth/locked`,
    });
  }

  if (!callbackRes.ok) {
    console.error(
      `[google-one-tap] Unexpected NextAuth response: HTTP ${callbackRes.status}, body:`,
      nextAuthBody
    );
    return void res.status(500).json({ ok: false, error: "Unexpected response from auth service" });
  }

  forwardCookies(callbackRes, res);

  let redirectUrl = `${baseUrl}/home`;

  if (callbackUrl && !callbackUrl.includes("/api/auth")) {
    const absolute = callbackUrl.startsWith("http") ? callbackUrl : `${baseUrl}${callbackUrl}`;
    if (isSameOrigin(absolute, baseUrl)) {
      redirectUrl = absolute;
    } else {
      console.warn("[google-one-tap] Ignoring non-same-origin callbackUrl:", absolute);
    }
  }

  try {
    const payloadB64 = credential.split(".")[1];
    if (!payloadB64) throw new Error("Malformed JWT: missing payload segment");

    const { email } = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as { email?: string };

    if (email) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { metadata: true },
      });

      const meta = user?.metadata as Record<string, unknown> | null;
      const currentStep = meta?.currentOnboardingStep;

      if (currentStep !== "completed") {
        const step = currentStep ? `/${currentStep}` : "";
        redirectUrl = `${baseUrl}/getting-started${step}`;
      }
    }
  } catch (err) {
    console.error("[google-one-tap] Failed to check onboarding status:", err);
  }

  return void res.status(200).json({ ok: true, redirectUrl });
}