import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { FUTURE_ROUTES_OVERRIDE_COOKIE_NAME as COOKIE_NAME } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const session = await getServerSession({ req, res });

  if (!session || !session.user || !session.user.email) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  let redirectUrl = "/";

  // We take you back where you came from if possible
  if (typeof req.headers["referer"] === "string") redirectUrl = req.headers["referer"];

  /* Only admins can opt-in to future routes for now */
  if (session.user.role !== "ADMIN") {
    res.redirect(redirectUrl);
    return;
  }

  // If has the cookie, Opt-out of V2
  if (COOKIE_NAME in req.cookies && req.cookies[COOKIE_NAME] === "1") {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=0; Max-Age=0; Path=/`);
  } else {
    /* Opt-int to V2 */
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=1; Path=/`);
  }

  res.redirect(redirectUrl);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
