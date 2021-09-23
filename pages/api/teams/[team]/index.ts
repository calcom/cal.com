import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // DELETE /api/teams/{team}
  if (req.method === "DELETE") {
    if (!session.user?.id) {
      console.log("Received session token without a user id.");
      return res.status(500).json({ message: "Something went wrong." });
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        teamId: parseInt(req.query.team as string),
      },
    });

    if (!membership || membership.role !== "OWNER") {
      console.log(`User ${session.user.id} tried deleting an organization they don't own.`);
      return res.status(403).json({ message: "Forbidden." });
    }

    await prisma.membership.delete({
      where: {
        userId_teamId: { userId: session.user.id, teamId: parseInt(req.query.team) },
      },
    });
    await prisma.team.delete({
      where: {
        id: parseInt(req.query.team),
      },
    });
    return res.status(204).send(null);
  }
}
