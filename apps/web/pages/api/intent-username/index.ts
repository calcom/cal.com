import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

import { checkPremiumUsername } from "@calcom/ee/lib/core/checkPremiumUsername";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { intentUsername } = req.body;
  // Check that user is authenticated
  const session = await getSession({ req });
  const userId = session?.user?.id;
  const user = await prisma.user.findFirst({ where: { id: userId }, rejectOnNotFound: true });
  const checkPremiumUsernameResult = await checkPremiumUsername(intentUsername);
  if (userId && user && user?.username) {
    await prisma.intentUsername.create({
      data: {
        userId,
        currentUsername: user?.username,
        intentUsername,
        isIntentPremium: checkPremiumUsernameResult.premium,
      },
    });
    res.end();
  }
}
