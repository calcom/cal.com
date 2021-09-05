import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const user = prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      username: true,
    },
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const description = req.body.description;
  delete req.body.description;

  try {
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        ...req.body,
        bio: description,
      },
    });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ message: "Username already taken" });
    }
  }

  return res.status(200).json({ message: "Profile updated successfully" });
}
