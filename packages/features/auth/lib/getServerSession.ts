import { parse, serialize } from "cookie";
import { LRUCache } from "lru-cache";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { AuthOptions, Session } from "next-auth";
import { getToken } from "next-auth/jwt";

import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { DeploymentRepository } from "@calcom/lib/server/repository/deployment";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["getServerSession"] });
/**
 * Stores the session in memory using the stringified token as the key.
 *
 */
const CACHE = new LRUCache<string, Session>({ max: 1000 });
const LAST_ACTIVE_CACHE = new LRUCache<number, true>({ max: 10000, ttl: 12 * 60 * 60 * 1000 });

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
  const { req, res, authOptions: { secret } = {} } = options;

  const token = await getToken({
    req,
    secret,
  });

  log.debug("Getting server session", safeStringify({ token }));

  if (!token || !token.email || !token.sub) {
    log.debug("Couldn't get token");
    return null;
  }

  const userId = Number(token.sub);
  if (Number.isFinite(userId)) {
    const cookieHeader = req.headers?.cookie ?? "";
    const { last_active_throttle } = parse(cookieHeader);
    if (!last_active_throttle && !LAST_ACTIVE_CACHE.has(userId)) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { lastActiveAt: new Date() },
        });
        LAST_ACTIVE_CACHE.set(userId, true);
        if (res) {
          const useSecureCookies = WEBAPP_URL?.startsWith("https://");
          const cookieValue = serialize("last_active_throttle", "1", {
            httpOnly: true,
            sameSite: "lax",
            secure: useSecureCookies,
            path: "/",
            maxAge: 12 * 60 * 60,
          });
          const existing = res.getHeader("Set-Cookie");
          if (existing) {
            res.setHeader(
              "Set-Cookie",
              Array.isArray(existing) ? [...existing, cookieValue] : [existing, cookieValue]
            );
          } else {
            res.setHeader("Set-Cookie", [cookieValue]);
          }
        }
      } catch (error) {
        log.debug("Failed to update lastActiveAt in getServerSession", safeStringify({ error }));
      }
    }
  }

  const cachedSession = CACHE.get(JSON.stringify(token));

  if (cachedSession) {
    log.debug("Returning cached session", safeStringify(cachedSession));
    return cachedSession;
  }

  const email = token.email.toLowerCase();

  const userFromDb = await prisma.user.findUnique({
    where: { email },
  });

  if (!userFromDb) {
    log.debug("No user found");
    return null;
  }

  const deploymentRepo = new DeploymentRepository(prisma);
  const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
  const hasValidLicense = await licenseKeyService.checkLicense();

  let upId = token.upId;

  if (!upId) {
    upId = `usr-${userFromDb.id}`;
  }

  if (!upId) {
    log.error("No upId found for session", { userId: userFromDb.id });
    return null;
  }

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.enrichUserWithTheProfile({
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
      completedOnboarding: user.completedOnboarding,
      role: user.role,
      image: getUserAvatarUrl({
        avatarUrl: user.avatarUrl,
      }),
      belongsToActiveTeam: token.belongsToActiveTeam,
      org: token.org,
      orgAwareUsername: token.orgAwareUsername,
      locale: user.locale ?? undefined,
      profile: user.profile,
      metadata: user.metadata as Record<string, any>,
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
