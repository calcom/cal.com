import { LRUCache } from "lru-cache";
import type { GetServerSidePropsContext, NextApiRequest } from "next";
import type { AuthOptions, Session } from "next-auth";
import { getToken } from "next-auth/jwt";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["getLightweightServerSession"] });

const CACHE = new LRUCache<string, Session>({ max: 1000 });

export async function getLightweightServerSession(options: {
  req: NextApiRequest | GetServerSidePropsContext["req"];
  authOptions?: AuthOptions;
}) {
  const { req, authOptions: { secret } = {} } = options;

  const token = await getToken({
    req,
    secret,
  });

  log.debug("Getting lightweight server session", safeStringify({ token }));

  if (!token || !token.email || !token.sub) {
    log.debug("Couldn't get token");
    return null;
  }

  const cachedSession = CACHE.get(JSON.stringify(token));

  if (cachedSession) {
    log.debug("Returning cached session", safeStringify(cachedSession));
    return cachedSession;
  }

  const email = token.email.toLowerCase();

  const userFromDb = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      emailVerified: true,
      completedOnboarding: true,
      role: true,
      avatarUrl: true,
      locale: true,
    },
  });

  if (!userFromDb) {
    log.debug("No user found");
    return null;
  }

  let upId = token.upId;

  if (!upId) {
    upId = `usr-${userFromDb.id}`;
  }

  if (!upId) {
    log.error("No upId found for session", { userId: userFromDb.id });
    return null;
  }

  const session: Session = {
    hasValidLicense: true,
    expires: new Date(typeof token.exp === "number" ? token.exp * 1000 : Date.now()).toISOString(),
    user: {
      id: userFromDb.id,
      name: userFromDb.name,
      username: userFromDb.username,
      email: userFromDb.email,
      emailVerified: userFromDb.emailVerified,
      email_verified: userFromDb.emailVerified !== null,
      completedOnboarding: userFromDb.completedOnboarding,
      role: userFromDb.role,
      image: getUserAvatarUrl({
        avatarUrl: userFromDb.avatarUrl,
      }),
      belongsToActiveTeam: token.belongsToActiveTeam,
      org: token.org,
      orgAwareUsername: token.orgAwareUsername,
      locale: userFromDb.locale ?? undefined,
      profile: {
        id: userFromDb.id,
        upId,
        username: userFromDb.username ?? `user-${userFromDb.id}`,
        organizationId: null,
        organization: null,
      },
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

  log.debug("Returned lightweight session", safeStringify(session));
  return session;
}
