import type { NextApiRequest, NextApiResponse } from "next";

import { ensureSession } from "@calcom/lib/auth";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { User } from ".prisma/client";

async function handler(
  req: NextApiRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _res: NextApiResponse<Response>
): Promise<{ error?: string; user?: Partial<User> }> {
  const session = await ensureSession({ req });
  /* Only admins can opt-in to V2 for now */
  if (!session) return { error: "You need to be logged in" };
  return { user: { ...session.user, email: session.user.email || "" } };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
