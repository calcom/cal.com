/* eslint-disable @typescript-eslint/no-unused-vars */
import * as trpc from "@trpc/server";
import { Maybe } from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getSession, Session } from "@lib/auth";
import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import prisma from "@lib/prisma";
import { defaultAvatarSrc } from "@lib/profile";

async function getUserFromSession(session: Maybe<Session>) {
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
      bufferTime: true,
      theme: true,
      createdDate: true,
      hideBranding: true,
      avatar: true,
      locale: true,
    },
  });

  // some hacks to make sure `username` and `email` are never inferred as `null`
  if (!user) {
    return null;
  }
  const { email, username } = user;
  if (!username || !email) {
    return null;
  }
  const avatar = user.avatar || defaultAvatarSrc({ email });
  return {
    ...user,
    avatar,
    email,
    username,
  };
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async ({ req, res }: trpcNext.CreateNextContextOptions) => {
  // for API-response caching see https://trpc.io/docs/caching
  const session = await getSession({ req });
  const locale = await getOrSetUserLocaleFromHeaders(req);

  return {
    localeProp: locale,
    prisma,
    session,
    user: await getUserFromSession(session),
    ...(await serverSideTranslations(locale, ["common"])),
  };
};

export type Context = trpc.inferAsyncReturnType<typeof createContext>;
