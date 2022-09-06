import type { NextApiRequest } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { schemaUserReadPublic } from "@lib/validations/user";

import { User } from ".prisma/client";

async function handler(req: NextApiRequest): Promise<{ error?: string; user?: Partial<User> }> {
  if (!prisma) return { error: "Cant connect to database" };
  console.log(req);
  if (!req.userId) return { error: "No user id found" };
  const data = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!data) return { error: "You need to pass apiKey" };
  const user = schemaUserReadPublic.parse(data);
  return { user };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
