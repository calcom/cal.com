import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId, returnTo } = req.query;

  await throwIfNotHaveAdminAccessToTeam({ teamId: Number(teamId) ?? null, userId: req.session.user.id });

  const installForObject = teamId ? { teamId: Number(teamId) } : { userId: req.session.user.id };
  const appType = "bigbluebutton_video";

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
        ...installForObject,
        appId: "bigbluebutton",
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for BigBlueButton");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  return res
    .status(200)
    .json({ url: returnTo ?? getInstalledAppPath({ variant: "conferencing", slug: "bigbluebutton" }) });
}
