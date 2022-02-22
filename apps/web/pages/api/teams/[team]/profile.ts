import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

// @deprecated - USE TRPC
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const isTeamOwner = !!(await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      teamId: parseInt(req.query.team as string),
      role: "OWNER",
    },
  }));

  if (!isTeamOwner) {
    res.status(403).json({ message: "You are not authorized to manage this team" });
    return;
  }

  // PATCH /api/teams/profile/{team}
  if (req.method === "PATCH") {
    const team = await prisma.team.findFirst({
      where: {
        id: parseInt(req.query.team as string),
      },
    });

    if (!team) {
      return res.status(404).json({ message: "Invalid team" });
    }

    const username = req.body.username;
    const userConflict = await prisma.team.findMany({
      where: {
        slug: username,
      },
    });
    const teamId = Number(req.query.team);
    if (userConflict.some((team) => team.id !== teamId)) {
      return res.status(409).json({ message: "Team username already taken" });
    }

    const name = req.body.name;
    const slug = req.body.username;
    const bio = req.body.description;
    const logo = req.body.logo;
    const hideBranding = req.body.hideBranding;

    await prisma.team.update({
      where: {
        id: team.id,
      },
      data: {
        name,
        slug,
        logo,
        bio,
        hideBranding,
      },
    });

    return res.status(200).json({ message: "Team updated successfully" });
  }
}
