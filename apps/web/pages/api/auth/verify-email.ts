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

  const user = await prisma.user.update({
    where: {
      email: foundToken?.identifier,
    },
    data: {
      emailVerified: new Date(),
    },
  });

  // Delete token from DB after it has been used
  await prisma.verificationToken.delete({
    where: {
      id: foundToken?.id,
    },
  });

  const hasCompletedOnboarding = user.completedOnboarding;

  res.redirect(`${WEBAPP_URL}/${hasCompletedOnboarding ? "/event-types" : "/getting-started"}`);
}
