import type { NextApiRequest, NextApiResponse } from "next";

import { ensureSession } from "@calcom/lib/auth";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  // Only logged in users can opt-in/out
  await ensureSession({ req });

  // If has the cookie, Opt-out of V2
  if ("calcom-v2-early-access" in req.cookies && req.cookies["calcom-v2-early-access"] === "1") {
    res.setHeader("Set-Cookie", `calcom-v2-early-access=0; Max-Age=0; Path=/`);
  } else {
    /* Opt-int to V2 */
    res.setHeader("Set-Cookie", "calcom-v2-early-access=1; Path=/");
  }

  let redirectUrl = "/";

  // We take you back where you came from if possible
  if (typeof req.headers["referer"] === "string") redirectUrl = req.headers["referer"];

  res.redirect(redirectUrl);
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
