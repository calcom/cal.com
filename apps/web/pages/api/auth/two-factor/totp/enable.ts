import type { NextApiRequest, NextApiResponse } from "next";
import { authenticator } from "otplib";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";

import { ErrorCode, getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getSession({ req });
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

  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: ErrorCode.TwoFactorAlreadyEnabled });
  }

  if (!user.twoFactorSecret) {
    return res.status(400).json({ error: ErrorCode.TwoFactorSetupRequired });
  }

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    console.error("Missing encryption key; cannot proceed with two factor setup.");
    return res.status(500).json({ error: ErrorCode.InternalServerError });
  }

  const secret = symmetricDecrypt(user.twoFactorSecret, process.env.CALENDSO_ENCRYPTION_KEY);
  if (secret.length !== 32) {
    console.error(
      `Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`
    );
    return res.status(500).json({ error: ErrorCode.InternalServerError });
  }

  const isValidToken = authenticator.check(req.body.code, secret);
  if (!isValidToken) {
    return res.status(400).json({ error: ErrorCode.IncorrectTwoFactorCode });
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      twoFactorEnabled: true,
    },
  });

  return res.json({ message: "Two-factor enabled" });
}
