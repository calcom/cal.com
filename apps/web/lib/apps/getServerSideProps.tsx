import type { GetServerSidePropsContext } from "next";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { AppCategories } from "@calcom/prisma/enums";

import { ssrInit } from "@server/lib/ssr";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req } = context;

  const ssr = await ssrInit(context);

  const session = await getServerSession({ req });

  let appStore, userAdminTeamsIds: number[];
  if (session?.user?.id) {
    const userAdminTeams = await UserRepository.getUserAdminTeams(session.user.id);
    userAdminTeamsIds = userAdminTeams?.teams?.map(({ team }) => team.id) ?? [];
    appStore = await getAppRegistryWithCredentials(session.user.id, userAdminTeamsIds);
  } else {
    appStore = await getAppRegistry();
    userAdminTeamsIds = [];
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
    props: {
      categories: Object.entries(categories)
        .map(([name, count]): { name: AppCategories; count: number } => ({
          name: name as AppCategories,
          count,
        }))
        .sort(function (a, b) {
          return b.count - a.count;
        }),
      appStore,
      userAdminTeams: userAdminTeamsIds,
      trpcState: ssr.dehydrate(),
    },
  };
};
