import { setUser as SentrySetUser } from "@sentry/nextjs";
import type { Session } from "next-auth";

import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TRPCContextInner } from "../createContext";
import { middleware } from "../trpc";

type Maybe<T> = T | null | undefined;

export async function getUserFromSession(ctx: TRPCContextInner, session: Maybe<Session>) {
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

  const locale = user?.locale ?? ctx.locale;
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

export const getSession = async (ctx: TRPCContextInner) => {
  const { req } = ctx;
  const { getServerSession } = await import("@calcom/features/auth/lib/getServerSession");
  return req ? await getServerSession({ req }) : null;
};

export const getUserSession = async (ctx: TRPCContextInner) => {
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
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Profile not found or not authorized" });
    }
  }

  let sessionWithUpId = null;
  if (session) {
    let upId = session.upId;
    if (!upId) {
      upId = foundProfile?.upId ?? `usr-${user?.id}`;
    }

    if (!upId) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No upId found for session" });
    }
    sessionWithUpId = {
      ...session,
      upId,
    };
  }
  return { user, session: sessionWithUpId };
};

export const isAuthed = middleware(async ({ ctx, next }) => {
  const middlewareStart = performance.now();

  const { user, session } = await getUserSession(ctx);

  const middlewareEnd = performance.now();
  logger.debug("Perf:t.isAuthed", middlewareEnd - middlewareStart);

  if (!user || !session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  SentrySetUser({ id: user.id });

  return next({
    ctx: { user, session },
  });
});

export const isAdminMiddleware = isAuthed.unstable_pipe(({ ctx, next }) => {
  const { user } = ctx;
  if (user?.role !== "ADMIN") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { user: user } });
});

// Org admins can be admins or owners
export const isOrgAdminMiddleware = isAuthed.unstable_pipe(({ ctx, next }) => {
  const { user } = ctx;
  if (!user?.organization?.isOrgAdmin) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { user: user } });
});
