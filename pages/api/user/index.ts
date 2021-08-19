import prisma from "@lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.method === "GET") {
    const user = await prisma.user.findFirst({
      where: {
        id: session.user.id,
      },
      select: {
        username: true,
      },
    });

    if (user) {
      return res.status(200).json(user);
    } else {
      return res.status(404).json({ message: "Not found" });
    }
  }
}

export default handler;
