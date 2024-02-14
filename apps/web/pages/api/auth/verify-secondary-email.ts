import { cleanUpVerificationTokens } from "@pages/api/auth/verify-email";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

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

  const secondaryUser = await prisma.secondaryEmail.findFirst({
    where: {
      email: foundToken?.identifier,
    },
  });

  if (!secondaryUser) {
    return res.status(401).json({ message: "Cannot find a user attached to this token" });
  }

  await prisma.secondaryEmail.update({
    where: {
      id: secondaryUser.id,
      email: secondaryUser?.email,
    },
    data: {
      emailVerified: new Date(),
    },
  });

  await cleanUpVerificationTokens(foundToken.id);

  return res.redirect(`${WEBAPP_URL}/settings/my-account/profile`);
}
