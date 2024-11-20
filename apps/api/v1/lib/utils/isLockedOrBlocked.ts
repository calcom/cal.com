import type { NextApiRequest } from "next";

function isEmailInBlacklist(email: string) {
  const blacklistedDomains = (process.env.BLACKLIST_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim());
  return blacklistedDomains.includes(email.split("@")[1]?.toLowerCase());
}

export async function isLockedOrBlocked(req: NextApiRequest) {
  const user = req.user;
  if (!user?.email) return false;
  return user.locked || isEmailInBlacklist(user.email);
}
