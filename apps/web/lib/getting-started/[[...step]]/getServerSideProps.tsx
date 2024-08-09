import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { ssrInit } from "@server/lib/ssr";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;

  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const ssr = await ssrInit(context);

  await ssr.viewer.me.prefetch();

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      completedOnboarding: true,
      teams: {
        select: {
          accepted: true,
          team: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      },
      credentials: {
        select: {
          appId: true,
          id: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User from session not found");
  }

  if (query?.step && query.step[0] === "connected-calendar" && !!query.callbackUrl) {
    if (
      user.completedOnboarding ||
      (user.credentials.length > 0 &&
        user.credentials.find((credential) => credential.appId === "google-calendar"))
    ) {
      return { redirect: { permanent: false, destination: query.callbackUrl.toString() } };
    }
  }

  if (user.completedOnboarding) {
    return { redirect: { permanent: false, destination: "/event-types" } };
  }
  const locale = await getLocale(context.req);
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
      trpcState: ssr.dehydrate(),
      hasPendingInvites: user.teams.find((team) => team.accepted === false) ?? false,
    },
  };
};
