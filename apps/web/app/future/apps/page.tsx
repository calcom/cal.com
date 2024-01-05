import AppsPage from "@pages/apps";
import { ssrInit } from "app/_trpc/ssrInit";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { UserAdminTeams } from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import getUserAdminTeams from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { APP_NAME } from "@calcom/lib/constants";
import type { AppCategories } from "@calcom/prisma/enums";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Apps | ${APP_NAME}`,
    () => ""
  );
};

const getPageProps = async () => {
  const ssr = await ssrInit();
  const req = { headers: headers(), cookies: cookies() };

  // @ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest
  const session = await getServerSession({ req });

  let appStore, userAdminTeams: UserAdminTeams;
  if (session?.user?.id) {
    userAdminTeams = await getUserAdminTeams({ userId: session.user.id, getUserInfo: true });
    appStore = await getAppRegistryWithCredentials(session.user.id, userAdminTeams);
  } else {
    appStore = await getAppRegistry();
    userAdminTeams = [];
  }

  const categoryQuery = appStore.map(({ categories }) => ({
    categories: categories || [],
  }));

  const categories = categoryQuery.reduce((c, app) => {
    for (const category of app.categories) {
      c[category] = c[category] ? c[category] + 1 : 1;
    }
    return c;
  }, {} as Record<string, number>);

  return {
    categories: Object.entries(categories)
      .map(([name, count]): { name: AppCategories; count: number } => ({
        name: name as AppCategories,
        count,
      }))
      .sort(function (a, b) {
        return b.count - a.count;
      }),
    appStore,
    userAdminTeams,
    dehydratedState: await ssr.dehydrate(),
  };
};

export default async function AppPageAppDir() {
  const { categories, appStore, userAdminTeams, dehydratedState } = await getPageProps();

  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper
      getLayout={getLayout}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}
      dehydratedState={dehydratedState}>
      <AppsPage categories={categories} appStore={appStore} userAdminTeams={userAdminTeams} />
    </PageWrapper>
  );
}
