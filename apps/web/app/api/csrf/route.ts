import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { WEBAPP_URL } from "@calcom/lib/constants";

export async function GET() {
  const token = randomBytes(32).toString("hex");

  const res = NextResponse.json({ csrfToken: token });

  // We need this cookie to be accessible from embeds where the booking flow is displayed within an iframe on a different origin.
  // For third‑party iframe contexts (embeds on other sites), browsers require SameSite=None and Secure to make the cookie available.
  // For local development on http://localhost we fall back to SameSite=Lax to avoid requiring https during development.
  const useSecureCookies = WEBAPP_URL.startsWith("https://");
  res.cookies.set("calcom.csrf_token", token, {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: useSecureCookies ? "none" : "lax",
    path: "/",
  });

  return res;
}
