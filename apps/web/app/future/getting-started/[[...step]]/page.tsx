import LegacyPage from "@pages/getting-started/[[...step]]";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { ssrInit } from "@server/lib/ssr";

const getData = async (ctx: GetServerSidePropsContext) => {
  const session = await getServerSession({ req: ctx.req });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }
  const ssr = await ssrInit(ctx);
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
              logo: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User from session not found");
  }

  if (user.completedOnboarding) {
    redirect("/event-types");
  }

  return {
    dehydratedState: ssr.dehydrate(),
    hasPendingInvites: user.teams.find((team) => team.accepted === false) ?? false,
    requiresLicense: false,
    themeBasis: null,
  };
};

export default WithLayout({ getLayout: null, getData, Page: LegacyPage });
