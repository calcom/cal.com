import { NextApiRequest, NextApiResponse } from "next";

import { ErrorCode, getSession, verifyPassword } from "@lib/auth";
import prisma from "@lib/prisma";

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

  if (!user.password) {
    return res.status(400).json({ error: ErrorCode.UserMissingPassword });
  }

  if (!user.twoFactorEnabled) {
    return res.json({ message: "Two factor disabled" });
  }

  const isCorrectPassword = await verifyPassword(req.body.password, user.password);
  if (!isCorrectPassword) {
    return res.status(400).json({ error: ErrorCode.IncorrectPassword });
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  return res.json({ message: "Two factor disabled" });
}
