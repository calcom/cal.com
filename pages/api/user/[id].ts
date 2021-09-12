import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const userIdQuery = req.query?.id ?? null;
  const userId = Array.isArray(userIdQuery) ? parseInt(userIdQuery.pop()) : parseInt(userIdQuery);

  const authenticatedUser = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
    },
  });

  if (userId !== authenticatedUser.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (req.method === "DELETE") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (req.method === "PATCH") {
    const data = req.body.data;
    const updatedUser = await prisma.user.update({
      where: {
        id: authenticatedUser.id,
      },
      data: {
        ...data,
      },
    });
    return res.status(200).json({ message: "User Updated", data: updatedUser });
  }
}
