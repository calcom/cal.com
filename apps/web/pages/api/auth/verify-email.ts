import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { TokenType } from "@calcom/prisma/enums";

const verifySchema = z.object({
  token: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = verifySchema.parse(req.query);

  const foundToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      type: TokenType.VERIFY_ACCOUNT,
    },
  });

  if (!foundToken) {
    res.status(401).json({ message: "No token found" });
  }

  const user = await prisma.user.update({
    where: {
      email: foundToken?.identifier,
    },
    data: {
      emailVerified: new Date(),
    },
  });

  const hasCompletedOnboarding = user.completedOnboarding;

  res.redirect(`${WEBAPP_URL}/${hasCompletedOnboarding ? "/event-types" : "/getting-started"}`);
}
