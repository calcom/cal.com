import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";

const verifySchema = z.object({
  token: z.string(),
});

async function cleanUpVerificationTokens(id: number) {
  // Delete token from DB after it has been used
  await prisma.verificationToken.delete({
    where: {
      id,
    },
  });
}

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
    console.log({ identifer: foundToken.identifier });
    throw new Error("Cannot find a user attached to this token.");
  }

  const userMetadataParsed = userMetadata.parse(user.metadata);
  // Attach the new email and verify
  if (userMetadataParsed?.emailChangeWaitingForVerification) {
    console.log({
      email: user.email,
      metadata: user.metadata,
      needsVerifying: userMetadataParsed?.emailChangeWaitingForVerification,
      parsedMetadata: userMetadataParsed,
    });

    // Ensure this email isnt in use
    const existingUser = await prisma.user.findUnique({
      where: { email: userMetadataParsed?.emailChangeWaitingForVerification },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw Error("A User already exists with this email");
    }

    // Update and re-verify
    const updated = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        email: userMetadataParsed?.emailChangeWaitingForVerification,
        emailVerified: new Date(),
      },
    });

    await cleanUpVerificationTokens(foundToken.id);

    // TODO: We can probably find a way to update session but the session gets destroyed and remains logged in.
    // We log the user out whenever a email change happens
    res.redirect(`${WEBAPP_URL}/`);
  } else {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: new Date(),
      },
    });
  }

  const hasCompletedOnboarding = user.completedOnboarding;

  await cleanUpVerificationTokens(foundToken.id);
  res.redirect(`${WEBAPP_URL}/${hasCompletedOnboarding ? "/event-types" : "/getting-started"}`);
}
