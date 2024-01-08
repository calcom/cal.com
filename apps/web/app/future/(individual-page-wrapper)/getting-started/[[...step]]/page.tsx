import LegacyPage from "@pages/getting-started/[[...step]]";
import { ssrInit } from "app/_trpc/ssrInit";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import PageWrapper from "@components/PageWrapperAppDir";

async function getData() {
  const req = { headers: headers(), cookies: cookies() };

  //@ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const ssr = await ssrInit();
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
    dehydratedState: await ssr.dehydrate(),
    hasPendingInvites: user.teams.find((team: any) => team.accepted === false) ?? false,
  };
}

export default async function Page() {
  const props = await getData();

  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={nonce} themeBasis={null} {...props}>
      <LegacyPage />
    </PageWrapper>
  );
}
