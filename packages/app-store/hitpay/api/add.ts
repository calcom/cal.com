import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import prisma from "@calcom/prisma";

import config from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId } = req.query;
  const teamIdNumber = teamId ? Number(teamId) : null;

  await throwIfNotHaveAdminAccessToTeam({ teamId: teamIdNumber, userId: req.session.user.id });
  const installForObject = teamIdNumber ? { teamId: teamIdNumber } : { userId: req.session.user.id };

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
        appId: "hitpay",
        ...(teamIdNumber ? { teamId: teamIdNumber } : { userId: req.session.user.id }),
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for HitPay");
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);

    return res.status(500).json({ message });
  }

  return res.status(200).json({ url: `/apps/hitpay/setup${teamIdNumber ? `?teamId=${teamIdNumber}` : ""}` });
}
