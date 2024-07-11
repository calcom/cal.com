import type { Session } from "next-auth";

import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TRPCContextInner } from "../createContext";
import { middleware } from "../trpc";

type Maybe<T> = T | null | undefined;

export async function getUserFromSession(ctx: TRPCContextInner, session: Maybe<Session>) {
  const { prisma } = ctx;
  if (!session) {
    return null;
  }

  if (!session.user?.id) {
    return null;
  }

  const userFromDb = await prisma.user.findUnique({
    where: {
      id: session.user.id,
      // Locked users can't login
      locked: false,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      emailVerified: true,
      bio: true,
      avatarUrl: true,
      timeZone: true,
      weekStart: true,
      startTime: true,
      endTime: true,
      defaultScheduleId: true,
      bufferTime: true,
      theme: true,
      appTheme: true,
      createdDate: true,
      hideBranding: true,
      twoFactorEnabled: true,
      disableImpersonation: true,
      identityProvider: true,
      identityProviderId: true,
      brandColor: true,
      darkBrandColor: true,
      movedToProfileId: true,
      selectedCalendars: {
        select: {
          externalId: true,
          integration: true,
        },
      },
      completedOnboarding: true,
      destinationCalendar: true,
      locale: true,
      timeFormat: true,
      trialEndsAt: true,
      metadata: true,
      role: true,
      allowDynamicBooking: true,
      allowSEOIndexing: true,
      receiveMonthlyDigestEmail: true,
    },
  });

  // some hacks to make sure `username` and `email` are never inferred as `null`
  if (!userFromDb) {
    return null;
  }

  const upId = session.upId;

  const user = await UserRepository.enrichUserWithTheProfile({
    user: userFromDb,
    upId,
  });

  logger.debug(
    `getUserFromSession: enriched user with profile - ${ctx.req?.url}`,
    safeStringify({ user, userFromDb, upId })
  );

  const { email, username, id } = user;
  if (!email || !id) {
    return null;
  }

  const userMetaData = userMetadata.parse(user.metadata || {});
  const orgMetadata = teamMetadataSchema.parse(user.profile?.organization?.metadata || {});
  // This helps to prevent reaching the 4MB payload limit by avoiding base64 and instead passing the avatar url

  const locale = user?.locale ?? ctx.locale;

  const isOrgAdmin = !!user.profile?.organization?.members.filter(
    (member) => (member.role === "ADMIN" || member.role === "OWNER") && member.userId === user.id
  ).length;

  if (isOrgAdmin) {
    logger.debug("User is an org admin", safeStringify({ userId: user.id }));
  } else {
    logger.debug("User is not an org admin", safeStringify({ userId: user.id }));
  }
  // Want to reduce the amount of data being sent
  if (isOrgAdmin && user.profile?.organization?.members) {
    user.profile.organization.members = [];
  }

  const organization = {
    ...user.profile?.organization,
    id: user.profile?.organization?.id ?? null,
    isOrgAdmin,
    metadata: orgMetadata,
    requestedSlug: orgMetadata?.requestedSlug ?? null,
  };

  return {
    ...user,
    avatar: `${WEBAPP_URL}/${user.username}/avatar.png?${organization.id}` && `orgId=${organization.id}`,
    // TODO: OrgNewSchema - later -  We could consolidate the props in user.profile?.organization as organization is a profile thing now.
    organization,
    organizationId: organization.id,
    id,
    email,
    username,
    locale,
    defaultBookerLayouts: userMetaData?.defaultBookerLayouts || null,
  };
}

export type UserFromSession = Awaited<ReturnType<typeof getUserFromSession>>;

const getSession = async (ctx: TRPCContextInner) => {
  const { req, res } = ctx;
  const { getServerSession } = await import("@calcom/features/auth/lib/getServerSession");
  return req ? await getServerSession({ req, res }) : null;
};

const getUserSession = async (ctx: TRPCContextInner) => {
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

const sessionMiddleware = middleware(async ({ ctx, next }) => {
  const middlewareStart = performance.now();
  const { user, session } = await getUserSession(ctx);
  const middlewareEnd = performance.now();
  logger.debug("Perf:t.sessionMiddleware", middlewareEnd - middlewareStart);
  return next({
    ctx: { user, session },
  });
});

export const isAuthed = middleware(async ({ ctx, next }) => {
  const middlewareStart = performance.now();

  const { user, session } = await getUserSession(ctx);

  const middlewareEnd = performance.now();
  logger.debug("Perf:t.isAuthed", middlewareEnd - middlewareStart);

  if (!user || !session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

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

export default sessionMiddleware;
