import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const user: User = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  delete user.password;

  res.status(200).json(user);
}
