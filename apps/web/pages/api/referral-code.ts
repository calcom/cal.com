import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { referralCode } = req.body;

  // Minimum length of a referral code is 5 characters
  if (referralCode.length < 5) return res.status(418).json({ valid: false });

  const username = referralCode.slice(0, -4);

  const referralPinQuery = await prisma.user.findUnique({
    where: {
      username: username,
    },
    select: {
      referralPin: true,
    },
  });

  if (!referralPinQuery) return res.status(418).json({ valid: false });

  if (username + referralPinQuery.referralPin === referralCode) {
    return res.status(200).json({ valid: true });
  } else {
    return res.status(418).json({ valid: false });
  }
}
