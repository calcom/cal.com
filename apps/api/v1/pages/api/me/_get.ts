import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { withPrismaApiHandler } from "@calcom/prisma/store/withPrismaApiHandler";

import { schemaUserReadPublic } from "~/lib/validations/user";

async function handler({ userId }: NextApiRequest) {
  const data = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    user: schemaUserReadPublic.parse({
      ...data,
      avatar: data.avatarUrl,
    }),
  };
}

export default withPrismaApiHandler(defaultResponder(handler));
