import { LRUCache } from "lru-cache";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { AuthOptions, Session } from "next-auth";
import { getToken } from "next-auth/jwt";

import checkLicense from "@calcom/features/ee/common/server/checkLicense";
import { CAL_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

/**
 * Stores the session in memory using the stringified token as the key.
 *
 */
const CACHE = new LRUCache<string, Session>({ max: 1000 });

/**
 * This is a slimmed down version of the `getServerSession` function from
 * `next-auth`.
 *
 * Instead of requiring the entire options object for NextAuth, we create
 * a compatible session using information from the incoming token.
 *
 * The downside to this is that we won't refresh sessions if the users
 * token has expired (30 days). This should be fine as we call `/auth/session`
 * frequently enough on the client-side to keep the session alive.
 */
export async function getServerSession(options: {
  req: NextApiRequest | GetServerSidePropsContext["req"];
  res?: NextApiResponse | GetServerSidePropsContext["res"];
  authOptions?: AuthOptions;
}) {
  const { req, authOptions: { secret } = {} } = options;

  const token = await getToken({
    req,
    secret,
  });

  if (!token || !token.email || !token.sub) {
    return null;
  }

  const cachedSession = CACHE.get(JSON.stringify(token));

  if (cachedSession) {
    return cachedSession;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: token.email.toLowerCase(),
    },
  });

  if (!user) {
    return null;
  }

  const hasValidLicense = await checkLicense(prisma);

  const session: Session = {
    hasValidLicense,
    expires: new Date(typeof token.exp === "number" ? token.exp * 1000 : Date.now()).toISOString(),
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      email_verified: user.emailVerified !== null,
      role: user.role,
      image: `${CAL_URL}/${user.username}/avatar.png`,
      impersonatedByUID: token.impersonatedByUID ?? undefined,
      belongsToActiveTeam: token.belongsToActiveTeam,
    },
  };

  CACHE.set(JSON.stringify(token), session);

  return session;
}
