import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { getTeamWithMembers } from "@lib/queries/teams";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (!session.user?.id) {
    console.log("Received session token without a user id.");
    return res.status(500).json({ message: "Something went wrong." });
  }
  if (!req.query.team) {
    console.log("Missing team query param.");
    return res.status(500).json({ message: "Something went wrong." });
  }

  const teamId = parseInt(req.query.team as string);

  // GET /api/teams/{team}
  if (req.method === "GET") {
    const team = await getTeamWithMembers(teamId);
    return res.status(200).json({ team });
  }
  // DELETE /api/teams/{team}
  if (req.method === "DELETE") {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        teamId,
      },
    });

    if (!membership || membership.role !== "OWNER") {
      console.log(`User ${session.user.id} tried deleting an organization they don't own.`);
      return res.status(403).json({ message: "Forbidden." });
    }

    await prisma.membership.delete({
      where: {
        userId_teamId: { userId: session.user.id, teamId },
      },
    });
    await prisma.team.delete({
      where: {
        id: teamId,
      },
    });
    return res.status(204).send(null);
  }
}
