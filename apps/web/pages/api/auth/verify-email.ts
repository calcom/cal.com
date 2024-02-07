import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";

const verifySchema = z.object({
  token: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = verifySchema.parse(req.query);

  const foundToken = await prisma.verificationToken.findFirst({
    where: {
      token,
    },
  });

  if (!foundToken) {
    return res.status(401).json({ message: "No token found" });
  }

  if (dayjs(foundToken?.expires).isBefore(dayjs())) {
    return res.status(401).json({ message: "Token expired" });
  }

  const user = await prisma.user.findFirst({
    where: {
      email: foundToken?.identifier,
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Cannot find a user attached to this token" });
  }

  const userMetadataParsed = userMetadata.parse(user.metadata);
  // Attach the new email and verify
  if (userMetadataParsed?.emailChangeWaitingForVerification) {
    // Ensure this email isnt in use
    const existingUser = await prisma.user.findUnique({
      where: { email: userMetadataParsed?.emailChangeWaitingForVerification },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return res.status(401).json({ message: "A User already exists with this email" });
    }

    const updatedEmail = userMetadataParsed.emailChangeWaitingForVerification;
    delete userMetadataParsed.emailChangeWaitingForVerification;

    // Update and re-verify
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        email: updatedEmail,
        metadata: userMetadataParsed,
      },
    });

    await cleanUpVerificationTokens(foundToken.id);

    return res.status(200).json({
      updatedEmail,
    });
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      emailVerified: new Date(),
    },
  });

  const hasCompletedOnboarding = user.completedOnboarding;

  return res.redirect(`${WEBAPP_URL}/${hasCompletedOnboarding ? "/event-types" : "/getting-started"}`);
}

async function cleanUpVerificationTokens(id: number) {
  // Delete token from DB after it has been used
  await prisma.verificationToken.delete({
    where: {
      id,
    },
  });
}
