import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const isTeamOwner = !!(await prisma.membership.findFirst({
    where: {
      userId: session.user?.id,
      teamId: parseInt(req.query.team as string),
      role: "OWNER",
    },
  }));

  if (!isTeamOwner) {
    res.status(403).json({ message: "You are not authorized to manage this team" });
    return;
  }

  // List members
  if (req.method === "GET") {
    const memberships = await prisma.membership.findMany({
      where: {
        teamId: parseInt(req.query.team as string),
      },
    });

    let members = await prisma.user.findMany({
      where: {
        id: {
          in: memberships.map((membership) => membership.userId),
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        timeZone: true,
      },
    });

    members = members.map((member) => {
      const membership = memberships.find((membership) => member.id === membership.userId);
      return {
        ...member,
        role: membership?.accepted ? membership?.role : "INVITEE",
      };
    });

    return res.status(200).json({ members: members });
  }

  // Cancel a membership (invite)
  if (req.method === "DELETE") {
    await prisma.membership.delete({
      where: {
        userId_teamId: { userId: req.body.userId, teamId: parseInt(req.query.team as string) },
      },
    });
    return res.status(204).send(null);
  }

  // Promote or demote a member of the team

  res.status(200).json({});
}
