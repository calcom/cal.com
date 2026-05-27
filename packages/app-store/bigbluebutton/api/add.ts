import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { metadata } from "../_metadata";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!req.session?.user?.id) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  const { teamId, returnTo } = req.query;
  let numericTeamId: number | null = null;

  if (teamId) {
    numericTeamId = Number(teamId);
  }

  await throwIfNotHaveAdminAccessToTeam({
    teamId: numericTeamId,
    userId: req.session.user.id,
  });

  let installForObject: { teamId: number } | { userId: number } = { userId: req.session.user.id };

  if (numericTeamId) {
    installForObject = { teamId: numericTeamId };
  }

  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: metadata.type,
        ...installForObject,
      },
    });

    if (alreadyInstalled) {
      throw new Error("Already installed");
    }

    const installation = await prisma.credential.create({
      data: {
        type: metadata.type,
        key: {},
        ...installForObject,
        appId: metadata.slug,
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for BigBlueButton");
    }
  } catch (error: unknown) {
    const httpError = getServerErrorFromUnknown(error);
    res.status(httpError.statusCode).json({ message: httpError.message });
    return;
  }

  res.status(200).json({
    url: returnTo ?? getInstalledAppPath({ variant: metadata.variant, slug: metadata.slug }),
  });
}
