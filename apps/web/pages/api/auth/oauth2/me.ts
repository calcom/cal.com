import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await prisma.user.findFirst({
    select: {
      username: true,
    },
  });
  return res.status(201).json(user);
}
