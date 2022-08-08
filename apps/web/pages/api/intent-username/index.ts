import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

import { defaultHandler } from "@calcom/lib/server";
import { checkUsername } from "@calcom/lib/server/checkUsername";
import prisma from "@calcom/prisma";
import { userMetadata as zodUserMetadata } from "@calcom/prisma/zod-utils";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { intentUsername } = req.body;
  // Check that user is authenticated
  try {
    const session = await getSession({ req });
    const userId = session?.user?.id;
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        metadata: true,
      },
      where: { id: userId },
      rejectOnNotFound: true,
    });
    const checkPremiumUsernameResult = await checkUsername(intentUsername);

    if (userId && user) {
      const userMetadata = zodUserMetadata.parse(user.metadata);

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

export default defaultHandler({
  GET: Promise.resolve({ default: getHandler }),
});
