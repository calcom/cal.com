import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import { totpAuthenticatorCheck } from "@calcom/lib/totp";
import prisma from "@calcom/prisma";

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

  let secret;
  try {
    secret = symmetricDecrypt(user.twoFactorSecret, {
      schema: z.string().length(32, "Expected key with length 32"),
      // Re-encrypt the secret with the new key
      onShouldUpdate: async (result) =>
        await prisma.user.update({
          where: {
            id: session.user.id,
          },
          data: {
            twoFactorSecret: symmetricEncrypt(result),
          },
        }),
    });
  } catch (error) {
    console.error(`Two factor secret decryption failed. ${error}`);
    secret = null;
  }

  if (!secret) {
    return res.status(500).json({ error: ErrorCode.InternalServerError });
  }

  const isValidToken = totpAuthenticatorCheck(req.body.code, secret);
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
