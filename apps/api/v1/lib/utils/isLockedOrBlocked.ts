import type { NextApiRequest } from "next";

import prisma from "@calcom/prisma";

function isEmailInBlacklist(email: string) {
  const blacklistedDomains = (process.env.BLACKLIST_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim());
  return blacklistedDomains.includes(email.split("@")[1]?.toLowerCase());
}

export async function isLockedOrBlocked(req: NextApiRequest) {
  const userId = req.userId;
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { locked: true, email: true } });

  if (!user?.email) return false;

  return user.locked || isEmailInBlacklist(user.email);
}
