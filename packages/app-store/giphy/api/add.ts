import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { throwIfNotHaveAdminAccessToTeam } from "../../_utils/throwIfNotHaveAdminAccessToTeam";

/**
 * This is an example endpoint for an app, these will run under `/api/integrations/[...args]`
 * @param req
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const userId = req.session.user.id;
  const appType = "giphy_other";
  const teamId = Number(req.query.teamId);
  const credentialOwner = req.query.teamId ? { teamId } : { userId: req.session.user.id };

  await throwIfNotHaveAdminAccessToTeam({ teamId: teamId ?? null, userId });

  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...credentialOwner,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        ...credentialOwner,
        appId: "giphy",
      },
    });
    if (!installation) {
      throw new Error("Unable to create user credential for giphy");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  return res.status(200).json({ url: getInstalledAppPath({ variant: "other", slug: "giphy" }) });
}
