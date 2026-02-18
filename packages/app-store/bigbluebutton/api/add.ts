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
      where: { type: appType, ...installForObject },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        ...installForObject,
        appId: "bigbluebutton",
      },
    });

    const redirectPath = returnTo
      ? String(returnTo)
      : getInstalledAppPath(
          { variant: "conferencing", slug: "bigbluebutton" },
          "setup"
        );
    res.status(200).json({ url: redirectPath });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Already installed") {
        return res.status(422).json({ message: "Already installed" });
      }
    }
    console.error("Error installing BigBlueButton app:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
