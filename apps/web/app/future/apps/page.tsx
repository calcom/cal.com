import AppsPage from "@pages/apps";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsContext } from "next";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { UserAdminTeams } from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import getUserAdminTeams from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { APP_NAME } from "@calcom/lib/constants";
import type { AppCategories } from "@calcom/prisma/enums";

import { ssrInit } from "@server/lib/ssr";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Apps | ${APP_NAME}`,
    () => ""
  );
};

const getData = async (ctx: GetServerSidePropsContext) => {
  const ssr = await ssrInit(ctx);

  const session = await getServerSession({ req: ctx.req });

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
    dehydratedState: ssr.dehydrate(),
  };
};

export default WithLayout({ getLayout, getData, Page: AppsPage });
