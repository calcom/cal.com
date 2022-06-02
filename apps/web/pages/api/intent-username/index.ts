import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

import { checkPremiumUsername } from "@calcom/ee/lib/core/checkPremiumUsername";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { intentUsername } = req.body;
  // Check that user is authenticated
  try {
    const session = await getSession({ req });
    const userId = session?.user?.id;
    const user = await prisma.user.findFirst({ where: { id: userId }, rejectOnNotFound: true });
    const checkPremiumUsernameResult = await checkPremiumUsername(intentUsername);

    if (userId && user) {
      const userWithMetadata = await prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      const userMetadata =
        userWithMetadata && !!userWithMetadata.metadata
          ? (userWithMetadata.metadata as Prisma.JsonObject)
          : {};

      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          metadata: {
            ...userMetadata,
            intentUsername,
            isIntentPremium: checkPremiumUsernameResult.premium,
          },
        },
      });
    }
  } catch (error) {
    res.status(501).send({ message: "intent-username.save.error" });
  }
  res.end();
}
