import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { getSession } from "next-auth/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // DELETE /api/teams/{team}
  if (req.method === "DELETE") {
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

  if (req.method === "PUT") {
    const updatedTeam = await prisma.team.update({
      where: {
        id: parseInt(req.query.team),
      },
      data: {
        ...req.body.data,
      },
    });
    return res.status(200).send(updatedTeam);
  }
}
