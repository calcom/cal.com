import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { schemaUserReadPublic } from "~/lib/validations/user";

async function handler({ userId }: NextApiRequest) {
  const data = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return { user: schemaUserReadPublic.parse(data) };
}

export default defaultResponder(handler);
