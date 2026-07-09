import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { isJwtIssuedBeforePasswordChange } from "@calcom/lib/auth/isJwtIssuedBeforePasswordChange";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { LRUCache } from "lru-cache";
import type { GetServerSidePropsContext, NextApiRequest } from "next";
import type { AuthOptions, Session } from "next-auth";
import { getToken } from "next-auth/jwt";

class LicenseKeySingleton {
  static async getInstance(..._args: unknown[]) { return new LicenseKeySingleton(); }
  async checkLicense() { return true; }
  async validateLicenseKey() { return true; }
}
class DeploymentRepository {
  constructor(_prisma?: unknown) {}
  async findFirst(..._args: unknown[]) { return null; }
}

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

  const userId = token.sub ? Number(token.sub) : null;

  if (!userId || userId <= 0) {
    log.warn("Invalid or missing user ID in token", { sub: token.sub });
    return null;
  }

  // The NextAuth jwt callback stamps revoked tokens with error: "SessionInvalidated"
  // and that flag is sticky across refreshes. Honor it first: NextAuth rotates a
  // token's `iat` forward every time /api/auth/session re-encodes the cookie, so a
  // warm/polling session can carry an `iat` later than passwordChangedAt while still
  // being revoked — the raw-iat check below would miss it, but the flag won't.
  if (token.error === "SessionInvalidated") {
    log.debug("Session invalidated (error flag)", { userId });
    CACHE.delete(JSON.stringify(token));
    return null;
  }

  // Session revocation on password change. A JWT issued before the user's last
  // password change must not authenticate, even when a session for this exact
  // token is already cached (the cache is keyed by the token, which doesn't
  // change on password change). This check runs BEFORE the cache lookup so a
  // stolen pre-change token can't ride a warm cache entry. Cost is one indexed
  // primary-key lookup per authenticated request.
  const userForRevocationCheck = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true },
  });

  if (!userForRevocationCheck) {
    log.warn("No user found for valid token", { userId });
    return null;
  }

  if (isJwtIssuedBeforePasswordChange(token.iat, userForRevocationCheck.passwordChangedAt)) {
    log.debug("Session invalidated by password change", { userId });
    CACHE.delete(JSON.stringify(token));
    return null;
  }

  const cachedSession = CACHE.get(JSON.stringify(token));

  if (cachedSession) {
    log.debug("Returning cached session", safeStringify(cachedSession));
    return cachedSession;
  }

  const userFromDb = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userFromDb) {
    log.warn("No user found for valid token", { userId });
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

  CACHE.set(JSON.stringify(token), session);

  log.debug("Returned session", safeStringify(session));
  return session;
}
