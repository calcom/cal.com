import { setUser as SentrySetUser } from "@sentry/nextjs";
import type { Session } from "next-auth";

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
  // There is no session ID, so we return null
  if (!session?.user?.id) return null;

  const userFromDb = await UserRepository.findUnlockedUserForSession({ userId: session.user.id });

  // some hacks to make sure `username` and `email` are never inferred as `null`
  if (!userFromDb) {
    return null;
  }

  const user = await UserRepository.enrichUserWithTheProfile({
    user: userFromDb,
    upId: session.upId,
  });

  const userMetaData = userMetadata.parse(user.metadata || {});
  const orgMetadata = teamMetadataSchema.parse(user.profile?.organization?.metadata || {});

  // strips out the members from the organization profile
  const { members = [], ..._organization } = user.profile?.organization || {};
  const isOrgAdmin =
    user.profile?.organization &&
    user.profile?.organization.members.some((member) => ["OWNER", "ADMIN"].includes(member.role));

  return {
    ...user,
    // TODO: Remove when we have PBAC (also, remove `members` from the organization profile)
    isOrgAdmin,
    profile: {
      ...user.profile,
      organization: {
        ..._organization,
        metadata: orgMetadata,
        requestedSlug: orgMetadata?.requestedSlug ?? null,
      },
    },
    locale: user?.locale ?? ctx.locale,
    defaultBookerLayouts: userMetaData?.defaultBookerLayouts || null,
  };
}

export type UserFromSession = Awaited<ReturnType<typeof getUserFromSession>>;

const getSession = async (ctx: TRPCContextInner) => {
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

export default sessionMiddleware;
