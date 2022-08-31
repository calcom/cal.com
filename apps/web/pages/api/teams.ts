import { MembershipRole } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import prisma from "@calcom/prisma";

import { getSession } from "@lib/auth";
import slugify from "@lib/slugify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const ownerUser = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      createdDate: true,
      name: true,
      plan: true,
      email: true,
    },
  });

  if (req.method === "POST") {
    const slug = slugify(req.body.name);

    const nameCollisions = await prisma.team.count({
      where: {
        OR: [{ name: req.body.name }, { slug: slug }],
      },
    });

    if (nameCollisions > 0) {
      return res.status(409).json({ errorCode: "TeamNameCollision", message: "Team name already taken." });
    }

    const createTeam = await prisma.team.create({
      data: {
        name: req.body.name,
        slug: slug,
      },
    });

    await prisma.membership.create({
      data: {
        teamId: createTeam.id,
        userId: session.user.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    // Sync Services: Close.com
    closeComUpsertTeamUser(createTeam, ownerUser, MembershipRole.OWNER);

    return res.status(201).json({ message: "Team created" });
  }

  res.status(404).json({ message: "Team not found" });
}
