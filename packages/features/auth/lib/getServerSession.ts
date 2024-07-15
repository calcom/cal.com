import { LRUCache } from "lru-cache";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { AuthOptions, Session } from "next-auth";
import { getToken } from "next-auth/jwt";

import checkLicense from "@calcom/features/ee/common/server/checkLicense";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["getServerSession"] });
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

  log.debug("Getting server session", safeStringify({ token }));

  if (!token || !token.email || !token.sub) {
    log.debug("Couldnt get token");
    return null;
  }

  const cachedSession = CACHE.get(JSON.stringify(token));

  if (cachedSession) {
    log.debug("Returning cached session", safeStringify(cachedSession));
    return cachedSession;
  }

  const userFromDb = await prisma.user.findUnique({
    where: {
      email: token.email.toLowerCase(),
    },
  });

  if (!userFromDb) {
    log.debug("No user found");
    return null;
  }

  const hasValidLicense = await checkLicense(prisma);

  let upId = token.upId;

  if (!upId) {
    upId = `usr-${userFromDb.id}`;
  }

  if (!upId) {
    log.error("No upId found for session", { userId: userFromDb.id });
    return null;
  }

  const user = await UserRepository.enrichUserWithTheProfile({
    user: userFromDb,
    upId,
  });

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
      image: getUserAvatarUrl({
        avatarUrl: user.avatarUrl,
      }),
      belongsToActiveTeam: token.belongsToActiveTeam,
      org: token.org,
      locale: user.locale ?? undefined,
      profile: user.profile,
    },
    profileId: token.profileId,
    upId,
  };

  if (token?.impersonatedBy?.id) {
    const impersonatedByUser = await prisma.user.findUnique({
      where: {
        id: token.impersonatedBy.id,
      },
      select: {
        id: true,
        role: true,
      },
    });
    if (impersonatedByUser) {
      session.user.impersonatedBy = {
        id: impersonatedByUser?.id,
        role: impersonatedByUser.role,
      };
    }
  }

  CACHE.set(JSON.stringify(token), session);

  log.debug("Returned session", safeStringify(session));
  return session;
}
