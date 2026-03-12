import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";

/**
 * This endpoint handles the installation of the Infomaniak kMeet app
 * It runs under `/api/integrations/[...args]`
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId, returnTo } = req.query;

  // Parse and validate teamId
  let parsedTeamId: number | null = null;
  if (teamId) {
    const teamIdNum = Number(teamId);
    if (isNaN(teamIdNum) || !Number.isInteger(teamIdNum)) {
      return res.status(400).json({ message: "Invalid teamId: must be a valid integer" });
    }
    parsedTeamId = teamIdNum;
  }

  await throwIfNotHaveAdminAccessToTeam({ teamId: parsedTeamId, userId: req.session.user.id });

  const installForObject = parsedTeamId ? { teamId: parsedTeamId } : { userId: req.session.user.id };
  const appType = "kmeet_video";

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
        appId: "kmeet",
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for kmeet");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  return res
    .status(200)
    .json({ url: returnTo ?? getInstalledAppPath({ variant: "conferencing", slug: "kmeet" }) });
}