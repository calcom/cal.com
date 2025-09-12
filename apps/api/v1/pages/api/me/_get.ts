import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

async function handler({ userId }: NextApiRequest) {
  const data = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    user: {
      ...data,
      avatar: data.avatarUrl,
    },
  };
}

export default defaultResponder(handler);
