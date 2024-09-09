import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import config from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }
  const appType = config.type;
  const teamId =
    req.query?.teamId && typeof req.query?.teamId === "string"
      ? parseInt(req.query?.teamId as string)
      : undefined;
  const whereClause =
    teamId !== undefined && !Number.isNaN(teamId)
      ? { type: appType, teamId }
      : { type: appType, userId: req.session.user.id };

  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: whereClause,
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        userId: req.session.user.id,
        appId: "paypal",
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for Paypal");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  return res.status(200).json({ url: "/apps/paypal/setup" });
}
