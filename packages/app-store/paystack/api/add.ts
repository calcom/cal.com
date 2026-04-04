import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";

import config from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId } = req.query;
  const teamIdNumber = teamId ? Number(teamId) : null;

  if (teamIdNumber !== null && Number.isNaN(teamIdNumber)) {
    return res.status(400).json({ message: "Invalid teamId" });
  }

  await throwIfNotHaveAdminAccessToTeam({ teamId: teamIdNumber, userId: req.session.user.id });

  const appType = config.type;
  const ownerFilter = teamIdNumber ? { teamId: teamIdNumber } : { userId: req.session.user.id };

  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...ownerFilter,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        appId: "paystack",
        ...ownerFilter,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Already installed") {
      return res.status(409).json({ message: error.message });
    }
    const httpError = getServerErrorFromUnknown(error);
    return res.status(httpError.statusCode).json({ message: httpError.message });
  }

  return res.status(200).json({ url: `/apps/paystack/setup${teamIdNumber ? `?teamId=${teamIdNumber}` : ""}` });
}
