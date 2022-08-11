import type { NextApiRequest, NextApiResponse } from "next";

import { ensureSession } from "@calcom/lib/auth";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  const session = await ensureSession({ req });
  /* Only admins can opt-in to V2 for now */
  if (session.user.role === "ADMIN") res.setHeader("Set-Cookie", "calcom-v2-early-access=1; Path=/");
  res.redirect("/");
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
