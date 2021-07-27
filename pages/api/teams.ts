import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import { getSession } from "next-auth/client";
import slugify from "slugify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method === "POST") {
    const slugifiedName = slugify(req.body.name, {
      lower: true,
    });

    const nameCollisions = await prisma.team.count({
      where: {
        OR: [{ name: req.body.name }, { slug: slugifiedName }],
      },
    });

    if (nameCollisions > 0) {
      return res.status(409).json({ errorCode: "TeamNameCollision", message: "Team name already take." });
    }

    const createTeam = await prisma.team.create({
      data: {
        name: req.body.name,
        slug: slugifiedName,
      },
    });

    await prisma.membership.create({
      data: {
        teamId: createTeam.id,
        userId: session.user.id,
        role: "OWNER",
        accepted: true,
      },
    });

    return res.status(201).json({ message: "Team created" });
  }

  res.status(404).json({ message: "Team not found" });
}
