import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { User } from ".prisma/client";

async function handler(
  req: NextApiRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _res: NextApiResponse<Response>
): Promise<{ error?: string; user?: Partial<User> }> {
  if (!prisma) return { error: "Cant connect to database" };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user) return { error: "You need to pass apiKey" };
  return { user };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
