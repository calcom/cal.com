import type { NextApiRequest, NextApiResponse } from "next";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session || !session.user || !session.user.email) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      password: true,
      identityProvider: true,
    },
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (user.identityProvider !== IdentityProvider.CAL) {
    return res.status(400).json({ error: ErrorCode.ThirdPartyIdentityProviderEnabled });
  }

  const oldPassword = req.body.oldPassword;
  const newPassword = req.body.newPassword;

  const currentPassword = user.password?.hash;
  if (!currentPassword) {
    return res.status(400).json({ error: ErrorCode.UserMissingPassword });
  }

  const passwordsMatch = await verifyPassword(oldPassword, currentPassword);
  if (!passwordsMatch) {
    return res.status(403).json({ error: ErrorCode.IncorrectPassword });
  }

  if (oldPassword === newPassword) {
    return res.status(400).json({ error: ErrorCode.NewPasswordMatchesOld });
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.userPassword.upsert({
    where: {
      userId: user.id,
    },
    create: {
      hash: hashedPassword,
      userId: user.id,
    },
    update: {
      hash: hashedPassword,
    },
  });

  res.status(200).json({ message: "Password updated successfully" });
}
