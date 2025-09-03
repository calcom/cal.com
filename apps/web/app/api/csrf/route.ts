import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { WEBAPP_URL } from "@calcom/lib/constants";

export async function GET() {
  const token = randomBytes(32).toString("hex");

  const res = NextResponse.json({ csrfToken: token });

  const useSecureCookies = WEBAPP_URL.startsWith("https://");
  res.cookies.set("calcom.csrf_token", token, {
    httpOnly: false,
    secure: useSecureCookies,
    sameSite: useSecureCookies ? "none" : "lax",
    path: "/",
  });

  return res;
}
