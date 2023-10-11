import type { NextApiRequest, NextApiResponse } from "next";

import Paypal from "@calcom/app-store/paypal/lib/Paypal";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import config from "../config.json";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const teamId = Number(req.query?.teamId);
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }
  try {
    const alreadyInstalled =
      (await prisma.credential.count({
        where: {
          appId: config.slug,
          ...(Boolean(teamId) ? { AND: [{ userId: userId }, { teamId }] } : { userId: userId }),
        },
      })) > 0;

    if (alreadyInstalled) {
      throw new Error("App is already installed");
    }
    const paypalClient = new Paypal();
    const onboardingLink = await paypalClient.getOnboardingLink(userId);
    return res.status(200).json({ url: onboardingLink });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: getHandler }),
});
