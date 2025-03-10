import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { FUTURE_ROUTES_OVERRIDE_COOKIE_NAME as COOKIE_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function GET() {
  const headersList = headers();
  const cookiesList = cookies();
  const legacyReq = buildLegacyRequest(headersList, cookiesList);

  const session = await getServerSession({ req: legacyReq });

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let redirectUrl = "/";

  // We take you back where you came from if possible
  const referer = headersList.get("referer");
  if (referer) redirectUrl = referer;

  const response = NextResponse.redirect(redirectUrl);

  // If has the cookie, Opt-out of V2
  if (cookiesList.has(COOKIE_NAME) && cookiesList.get(COOKIE_NAME)?.value === "1") {
    response.cookies.set(COOKIE_NAME, "0", { maxAge: 0, path: "/" });
  } else {
    /* Opt-in to V2 */
    response.cookies.set(COOKIE_NAME, "1", { path: "/" });
  }

  return response;
}
