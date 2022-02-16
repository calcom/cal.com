import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session || !session.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.method === "GET") {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: session.user.id,
      },
    });

    const teams = await prisma.team.findMany({
      where: {
        id: {
          in: memberships.map((membership) => membership.teamId),
        },
      },
    });

    return res.status(200).json({
      membership: memberships.map((membership) => ({
        role: membership.accepted ? membership.role : "INVITEE",
        ...teams.find((team) => team.id === membership.teamId),
      })),
    });
  }

  if (!req.body.teamId) {
    return res.status(400).json({ message: "Bad request" });
  }

  // Leave team or decline membership invite of current user
  if (req.method === "DELETE") {
    await prisma.membership.delete({
      where: {
        userId_teamId: { userId: session.user.id, teamId: req.body.teamId },
      },
    });
    return res.status(204).send(null);
  }

  // Accept team invitation
  if (req.method === "PATCH") {
    await prisma.membership.update({
      where: {
        userId_teamId: { userId: session.user.id, teamId: req.body.teamId },
      },
      data: {
        accepted: true,
      },
    });

    return res.status(204).send(null);
  }
}
