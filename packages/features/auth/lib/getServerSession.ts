import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { LRUCache } from "lru-cache";
import type { GetServerSidePropsContext, NextApiRequest } from "next";
import type { AuthOptions, Session } from "next-auth";
import { getToken } from "next-auth/jwt";

const log = logger.getSubLogger({ prefix: ["getServerSession"] });

const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE = new LRUCache<string, Session>({ max: 1000, ttl: SESSION_CACHE_TTL });

/**
 * Only the fields from the user table that getServerSession actually uses
 * to build the Session object.
 */
const sessionUserSelect = {
  id: true,
  uuid: true,
  name: true,
  username: true,
  email: true,
  emailVerified: true,
  completedOnboarding: true,
  role: true,
  avatarUrl: true,
  locale: true,
} as const;

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
  authOptions?: AuthOptions;
}) {
  const { req, authOptions: { secret } = {} } = options;

  const token = await getToken({
    req,
    secret,
  });

  log.debug("Getting server session", safeStringify({ token }));

  if (!token || !token.email || !token.sub) {
    log.debug("Couldn't get token");
    return null;
  }

  // Include all token fields that flow into the Session object so that changes
  // (e.g. team subscription lapsing) don't serve stale data. Excludes exp/iat/jti
  // which change on every refresh but don't affect session content.
  const cacheKey = `${token.sub}:${token.upId ?? ""}:${token.profileId ?? ""}:${token.impersonatedBy?.id ?? ""}:${token.belongsToActiveTeam ?? ""}:${token.orgAwareUsername ?? ""}:${JSON.stringify(token.org ?? "")}`;
  const cachedSession = CACHE.get(cacheKey);

  if (cachedSession) {
    log.debug("Returning cached session", safeStringify(cachedSession));
    return cachedSession;
  }

  const userId = token.sub ? Number(token.sub) : null;

  if (!userId || userId <= 0) {
    log.warn("Invalid or missing user ID in token", { sub: token.sub });
    return null;
  }

  const userFromDb = await prisma.user.findUnique({
    where: { id: userId },
    select: sessionUserSelect,
  });

  if (!userFromDb) {
    log.warn("No user found for valid token", { userId });
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

  // Run the license check and profile enrichment concurrently since they are independent.
  const deploymentRepo = new DeploymentRepository(prisma);
  const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
  const userRepository = new UserRepository(prisma);

  const [hasValidLicense, user] = await Promise.all([
    licenseKeyService.checkLicense(),
    userRepository.enrichUserWithTheProfile({
      user: userFromDb,
      upId,
    }),
  ]);

  const session: Session = {
    hasValidLicense,
    expires: new Date(typeof token.exp === "number" ? token.exp * 1000 : Date.now()).toISOString(),
    user: {
      id: user.id,
      uuid: user.uuid,
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
        uuid: true,
        role: true,
      },
    });
    if (impersonatedByUser) {
      session.user.impersonatedBy = {
        id: impersonatedByUser?.id,
        uuid: impersonatedByUser.uuid,
        role: impersonatedByUser.role,
      };
    }
  }

  CACHE.set(cacheKey, session);

  log.debug("Returned session", safeStringify(session));
  return session;
}

export function clearSessionCache() {
  CACHE.clear();
}
