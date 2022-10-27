import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
    },
  });
  return res.status(200).json({ users });
}
