import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { authenticator } from "otplib";
import qrcode from "qrcode";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

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

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { password: true } });
  if (!user) {
    console.error(`Session references user that no longer exists.`);
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (user.identityProvider !== IdentityProvider.CAL && !user.password?.hash) {
    return res.status(400).json({ error: ErrorCode.ThirdPartyIdentityProviderEnabled });
  }

  if (!user.password?.hash) {
    return res.status(400).json({ error: ErrorCode.UserMissingPassword });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: ErrorCode.TwoFactorAlreadyEnabled });
  }

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    console.error("Missing encryption key; cannot proceed with two factor setup.");
    return res.status(500).json({ error: ErrorCode.InternalServerError });
  }

  const isCorrectPassword = await verifyPassword(req.body.password, user.password.hash);
  if (!isCorrectPassword) {
    return res.status(400).json({ error: ErrorCode.IncorrectPassword });
  }

  // This generates a secret 32 characters in length. Do not modify the number of
  // bytes without updating the sanity checks in the enable and login endpoints.
  const secret = authenticator.generateSecret(20);

  // generate backup codes with 10 character length
  const backupCodes = Array.from(Array(10), () => crypto.randomBytes(5).toString("hex"));

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      backupCodes: symmetricEncrypt(JSON.stringify(backupCodes), process.env.CALENDSO_ENCRYPTION_KEY),
      twoFactorEnabled: false,
      twoFactorSecret: symmetricEncrypt(secret, process.env.CALENDSO_ENCRYPTION_KEY),
    },
  });

  const name = user.email || user.username || user.id.toString();
  const keyUri = authenticator.keyuri(name, "Cal", secret);
  const dataUri = await qrcode.toDataURL(keyUri);

  return res.json({ secret, keyUri, dataUri, backupCodes });
}
