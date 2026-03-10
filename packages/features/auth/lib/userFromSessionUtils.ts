import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";
import type { GetServerSidePropsContext, NextApiRequest } from "next";
import type { Session } from "next-auth";

type Maybe<T> = T | null | undefined;

export type SessionContext = {
  req?: NextApiRequest | GetServerSidePropsContext["req"];
  locale?: string;
  session?: Session | null;
};

async function getUserFromSession(ctx: SessionContext, session: Maybe<Session>) {
  if (!session) {
    return null;
  }

  if (!session.user?.id) {
    return null;
  }

  const userRepo = new UserRepository(prisma);
  const userFromDb = await userRepo.findUnlockedUserForSession({ userId: session.user.id });

  // some hacks to make sure `username` and `email` are never inferred as `null`
  if (!userFromDb) {
    return null;
  }

  const upId = session.upId;

  const user = await userRepo.enrichUserWithTheProfile({
    user: userFromDb,
    upId,
  });

  logger.debug(
    `getUserFromSession: enriched user with profile - ${ctx.req?.url}`,
    safeStringify({ user, userFromDb, upId })
  );

  const { email, username, id, uuid } = user;
  if (!email || !id) {
    return null; // should we return null here?
  }

  const userMetaData = userMetadata.parse(user.metadata || {});
  const orgMetadata = teamMetadataSchema.parse(user.profile?.organization?.metadata || {});
  // This helps to prevent reaching the 4MB payload limit by avoiding base64 and instead passing the avatar url

  const locale = user?.locale ?? ctx.locale ?? "en";
  const { members = [], ..._organization } = user.profile?.organization || {};
  const isOrgAdmin = members.some((member: { role: string }) => ["OWNER", "ADMIN"].includes(member.role));

  if (isOrgAdmin) {
    logger.debug("User is an org admin", safeStringify({ userId: user.id }));
  } else {
    logger.debug("User is not an org admin", safeStringify({ userId: user.id }));
  }
  const organization = {
    ..._organization,
    id: user.profile?.organization?.id ?? null,
    isOrgAdmin,
    metadata: orgMetadata,
    requestedSlug: orgMetadata?.requestedSlug ?? null,
  };

  return {
    ...user,
    avatar: `${WEBAPP_URL}/${user.username}/avatar.png${organization.id ? `?orgId=${organization.id}` : ""}`,
    // TODO: OrgNewSchema - later -  We could consolidate the props in user.profile?.organization as organization is a profile thing now.
    organization,
    organizationId: organization.id,
    id,
    uuid,
    email,
    username,
    locale,
    defaultBookerLayouts: userMetaData?.defaultBookerLayouts || null,
    requiresBookerEmailVerification: user.requiresBookerEmailVerification,
  };
}

export type UserFromSession = Awaited<ReturnType<typeof getUserFromSession>>;

export const getSession = async (ctx: SessionContext) => {
  const { req } = ctx;
  const { getServerSession } = await import("@calcom/features/auth/lib/getServerSession");
  return req ? await getServerSession({ req }) : null;
};

export const getUserSession = async (ctx: SessionContext) => {
  /**
   * It is possible that the session and user have already been added to the context by a previous middleware
   * or when creating the context
   */
  const session = ctx.session || (await getSession(ctx));
  const user = session ? await getUserFromSession(ctx, session) : null;
  let foundProfile = null;
  // Check authorization for profile
  if (session?.profileId && user?.id) {
    foundProfile = await ProfileRepository.findByUserIdAndProfileId({
      userId: user.id,
      profileId: session.profileId,
    });
    if (!foundProfile) {
      logger.error(
        "Profile not found or not authorized",
        safeStringify({ profileId: session.profileId, userId: user?.id })
      );
      // TODO: Test that logout should happen automatically
      throw new ErrorWithCode(ErrorCode.Unauthorized, "Profile not found or not authorized");
    }
  }

  let sessionWithUpId = null;
  if (session) {
    let upId = session.upId;
    if (!upId) {
      upId = foundProfile?.upId ?? `usr-${user?.id}`;
    }

    if (!upId) {
      throw new ErrorWithCode(ErrorCode.InternalServerError, "No upId found for session");
    }
    sessionWithUpId = {
      ...session,
      upId,
    };
  }
  return { user, session: sessionWithUpId };
};
