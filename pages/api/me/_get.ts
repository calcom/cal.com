import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaUserReadPublic } from "@lib/validations/user";

import { User } from ".prisma/client";

async function handler({
  userId,
  prisma,
}: NextApiRequest): Promise<{ error?: string; user?: Partial<User> }> {
  const data = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!prisma) return { error: "Cant connect to database" };

  if (!userId) return { error: "No user id found" };
  if (!data) return { error: "You need to pass apiKey" };
  const user = schemaUserReadPublic.parse(data);
  return { user };
}

export default defaultResponder(handler);
