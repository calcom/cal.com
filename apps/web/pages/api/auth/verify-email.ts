import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(req.query);

  const { email, verificationToken } = req.query;

  if (!email || !verificationToken) {
    res.status(400).redirect("/auth/email-verified?error=missing-fields");
    return;
  }

  const verificationTokenQuery = await prisma.verificationToken.findFirst({
    where: {
      token: verificationToken,
    },
  });

  if (verificationTokenQuery?.identifier !== email) {
    res.status(400).redirect("/auth/email-verified?error=invalid-token");
    return;
  }

  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  if (!user) res.status(404).redirect("/auth/email-verified?error=user-not-found");

  res.status(200).redirect("/auth/email-verified");
}
