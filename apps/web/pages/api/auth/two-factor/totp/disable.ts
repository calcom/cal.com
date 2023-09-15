import type { NextApiRequest, NextApiResponse } from "next";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { totpAuthenticatorCheck } from "@calcom/lib/totp";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession({ req, res });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!session.user?.id) {
    console.error("Session is missing a user id.");
    return res.status(500).json({ error: ErrorCode.InternalServerError });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    console.error(`Session references user that no longer exists.`);
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!user.password && user.identityProvider === IdentityProvider.CAL) {
    return res.status(400).json({ error: ErrorCode.UserMissingPassword });
  }

  if (!user.twoFactorEnabled) {
    return res.json({ message: "Two factor disabled" });
  }

  if (user.password && user.identityProvider === IdentityProvider.CAL) {
    const isCorrectPassword = await verifyPassword(req.body.password, user.password);
    if (!isCorrectPassword) {
      return res.status(400).json({ error: ErrorCode.IncorrectPassword });
    }
  }

  // if user has 2fa and using backup code
  if (user.twoFactorEnabled && req.body.backupCode) {
    if (!process.env.CALENDSO_ENCRYPTION_KEY) {
      console.error("Missing encryption key; cannot proceed with backup code login.");
      throw new Error(ErrorCode.InternalServerError);
    }

    if (!user.backupCodes) {
      return res.status(400).json({ error: ErrorCode.MissingBackupCodes });
    }

    const backupCodes = JSON.parse(symmetricDecrypt(user.backupCodes, process.env.CALENDSO_ENCRYPTION_KEY));

    // check if user-supplied code matches one
    const index = backupCodes.indexOf(req.body.backupCode.replaceAll("-", ""));
    if (index === -1) {
      return res.status(400).json({ error: ErrorCode.IncorrectBackupCode });
    }

    // we delete all stored backup codes at the end, no need to do this here

    // if user has 2fa and NOT using backup code, try totp
  } else if (user.twoFactorEnabled) {
    if (!req.body.code) {
      return res.status(400).json({ error: ErrorCode.SecondFactorRequired });
      // throw new Error(ErrorCode.SecondFactorRequired);
    }

    if (!user.twoFactorSecret) {
      console.error(`Two factor is enabled for user ${user.id} but they have no secret`);
      throw new Error(ErrorCode.InternalServerError);
    }

    if (!process.env.CALENDSO_ENCRYPTION_KEY) {
      console.error(`"Missing encryption key; cannot proceed with two factor login."`);
      throw new Error(ErrorCode.InternalServerError);
    }

    const secret = symmetricDecrypt(user.twoFactorSecret, process.env.CALENDSO_ENCRYPTION_KEY);
    if (secret.length !== 32) {
      console.error(
        `Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`
      );
      throw new Error(ErrorCode.InternalServerError);
    }

    // If user has 2fa enabled, check if body.code is correct
    const isValidToken = totpAuthenticatorCheck(req.body.code, secret);
    if (!isValidToken) {
      return res.status(400).json({ error: ErrorCode.IncorrectTwoFactorCode });

      // throw new Error(ErrorCode.IncorrectTwoFactorCode);
    }
  }
  // If it is, disable users 2fa
  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      backupCodes: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  return res.json({ message: "Two factor disabled" });
}
