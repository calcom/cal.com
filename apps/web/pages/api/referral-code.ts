import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { referralCode } = req.body;
  console.log("🚀 ~ file: referral-code.ts ~ line 7 ~ handler ~ referralCode", referralCode);
  const username = referralCode.slice(0, -4);
  console.log("🚀 ~ file: referral-code.ts ~ line 9 ~ handler ~ userName", username);

  const referralPinQuery = await prisma.user.findUnique({
    where: {
      username: username,
    },
    select: {
      referralPin: true,
    },
  });
  console.log("🚀 ~ file: referral-code.ts ~ line 19 ~ handler ~ referralPinQuery", referralPinQuery);

  return res.status(200).json({ valid: true });

  //   if (username + referralPinQuery.referralPin === referralCode) {
  //     return res.status(200).json({ valid: true });
  //   } else {
  //     return res.status(418).json({ valid: false });
  //   }
}
