import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
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
    const created = await prisma.$transaction(async (tx) => {
      const alreadyInstalled = await tx.credential.findFirst({
        where: { type: appType, ...ownerFilter },
        select: { id: true },
      });
      if (alreadyInstalled) {
        return null;
      }
      return tx.credential.create({
        data: {
          type: appType,
          key: {},
          appId: "paystack",
          ...ownerFilter,
        },
        select: { id: true },
      });
    });

    if (!created) {
      return res.status(409).json({ message: "Already installed" });
    }
  } catch (error: unknown) {
    const httpError = getServerErrorFromUnknown(error);
    return res.status(httpError.statusCode).json({ message: httpError.message });
  }

  return res
    .status(201)
    .json({ url: `/apps/paystack/setup${teamIdNumber ? `?teamId=${teamIdNumber}` : ""}` });
}
