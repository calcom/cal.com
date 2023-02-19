import type { GetServerSidePropsContext } from "next";
import type { Session } from "next-auth";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getSession } from "@calcom/lib/auth";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultAvatarSrc } from "@calcom/lib/defaultAvatarImage";
import { getLocaleFromHeaders } from "@calcom/lib/i18n";
import prisma from "@calcom/prisma";

import type { Maybe } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";

type CreateContextOptions = CreateNextContextOptions | GetServerSidePropsContext;

async function getUserFromSession({
  session,
  req,
}: {
  session: Maybe<Session>;
  req: CreateContextOptions["req"];
}) {
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      timeZone: true,
      weekStart: true,
      startTime: true,
      endTime: true,
      defaultScheduleId: true,
      bufferTime: true,
      theme: true,
      createdDate: true,
      hideBranding: true,
      avatar: true,
      twoFactorEnabled: true,
      disableImpersonation: true,
      identityProvider: true,
      brandColor: true,
      darkBrandColor: true,
      away: true,
      credentials: {
        select: {
          id: true,
          type: true,
          key: true,
          userId: true,
          appId: true,
          invalid: true,
        },
        orderBy: {
          id: "asc",
        },
      },
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
    },
  });

  // some hacks to make sure `username` and `email` are never inferred as `null`
  if (!user) {
    return null;
  }
  const { email, username } = user;
  if (!email) {
    return null;
  }
  const rawAvatar = user.avatar;
  // This helps to prevent reaching the 4MB payload limit by avoiding base64 and instead passing the avatar url
  user.avatar = rawAvatar ? `${WEBAPP_URL}/${user.username}/avatar.png` : defaultAvatarSrc({ email });

  const locale = user.locale || getLocaleFromHeaders(req);
  return {
    ...user,
    rawAvatar,
    email,
    username,
    locale,
  };
}

type CreateInnerContextOptions = {
  session: Session | null;
  locale: string;
  user: Awaited<ReturnType<typeof getUserFromSession>>;
  i18n: Awaited<ReturnType<typeof serverSideTranslations>>;
} & Partial<CreateContextOptions>;

/**
 * Inner context. Will always be available in your procedures, in contrast to the outer context.
 *
 * Also useful for:
 * - testing, so you don't have to mock Next.js' `req`/`res`
 * - tRPC's `createSSGHelpers` where we don't have `req`/`res`
 *
 * @see https://trpc.io/docs/context#inner-and-outer-context
 */
export async function createContextInner(opts: CreateInnerContextOptions) {
  return {
    prisma,
    ...opts,
  };
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async ({ req, res }: CreateContextOptions, sessionGetter = getSession) => {
  // for API-response caching see https://trpc.io/docs/caching
  const session = await sessionGetter({ req });

  const user = await getUserFromSession({ session, req });
  const locale = user?.locale ?? getLocaleFromHeaders(req);
  const i18n = await serverSideTranslations(locale, ["common", "vital"]);

  const contextInner = await createContextInner({ session, i18n, locale, user });
  return {
    ...contextInner,
    req,
    res,
  };
};
