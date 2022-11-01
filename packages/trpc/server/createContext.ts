import type { GetServerSidePropsContext } from "next";
import type { Session } from "next-auth";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getSession } from "@calcom/lib/auth";
import { CAL_URL } from "@calcom/lib/constants";
import { getLocaleFromHeaders } from "@calcom/lib/i18n";
import { defaultAvatarSrc } from "@calcom/lib/profile";
import prisma from "@calcom/prisma";

import * as trpc from "@trpc/server";
import { Maybe } from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";

type CreateContextOptions = trpcNext.CreateNextContextOptions | GetServerSidePropsContext;

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
      plan: true,
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
  // This helps to prevent reaching the 4MB payload limit by avoiding base64 and instead passing the avatar url
  // TODO: Setting avatar value to /avatar.png(which is a dynamic route) would actually reset the avatar because /avatar.png is supposed to return the value of user.avatar
  // if (user.avatar) user.avatar = `${CAL_URL}/${user.username}/avatar.png`;
  const avatar = user.avatar || defaultAvatarSrc({ email });

  const locale = user.locale || getLocaleFromHeaders(req);
  return {
    ...user,
    avatar,
    email,
    username,
    locale,
  };
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async ({ req }: CreateContextOptions) => {
  // for API-response caching see https://trpc.io/docs/caching
  const session = await getSession({ req });

  const user = await getUserFromSession({ session, req });
  const locale = user?.locale ?? getLocaleFromHeaders(req);
  const i18n = await serverSideTranslations(locale, ["common", "vital"]);
  return {
    i18n,
    prisma,
    session,
    user,
    locale,
  };
};

export type Context = trpc.inferAsyncReturnType<typeof createContext>;
