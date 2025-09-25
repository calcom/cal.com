import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToCalIdTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToCalIdTeam";
import prisma from "@calcom/prisma";

import config from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId, calIdTeamId } = req.query;

  await throwIfNotHaveAdminAccessToCalIdTeam({
    teamId: Number(calIdTeamId) ?? Number(teamId) ?? null,
    userId: req.session.user.id,
  });
  const installForObject = calIdTeamId
    ? { calIdTeamId: Number(calIdTeamId) }
    : teamId
    ? { teamId: Number(teamId) }
    : { userId: req.session.user.id };

  const appType = config.type;
  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...installForObject,
      },
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
