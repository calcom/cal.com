import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { WEBAPP_URL } from "@calcom/lib/constants";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sameSiteParam = url.searchParams.get("sameSite");

  // Validate the param, default to "lax"
  let sameSite: "lax" | "strict" | "none" = "lax";
  if (sameSiteParam === "strict" || sameSiteParam === "none") {
    sameSite = sameSiteParam;
  }

  const token = randomBytes(32).toString("hex");
  const res = NextResponse.json({ csrfToken: token });

  const useSecureCookies = WEBAPP_URL.startsWith("https://");

  res.cookies.set("calcom.csrf_token", token, {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite,
    path: "/",
  });

  return res;
}
