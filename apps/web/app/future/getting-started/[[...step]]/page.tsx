import LegacyPage from "@pages/getting-started/[[...step]]";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import type { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssrInit } from "@server/lib/ssr";

const getData = async (ctx: ReturnType<typeof buildLegacyCtx>) => {
  const req = { headers: headers(), cookies: cookies() };

  //@ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }
  // @ts-expect-error Argument of type '{ query: Params; params: Params; req: { headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }; }' is not assignable to parameter of type 'GetServerSidePropsContext'.
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
    hasPendingInvites: user.teams.find((team: any) => team.accepted === false) ?? false,
    requiresLicense: false,
    themeBasis: null,
  };
};

export default WithLayout({ getLayout: null, getData, Page: LegacyPage });
