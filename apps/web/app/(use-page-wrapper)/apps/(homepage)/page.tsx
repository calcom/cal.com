import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { AppCategories } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import AppsPage from "~/apps/apps-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description"),
    undefined,
    undefined,
    "/apps"
  );
};
const getCachedAppRegistry = unstable_cache(
  async () => {
    return await getAppRegistry();
  },
  ["appRegistry.get"],
  { revalidate: 3600 } // Cache for 1 hour
);

const getCachedAppRegistryWithCredentials = unstable_cache(
  async (userId: number, teamIds: number[]) => {
    return await getAppRegistryWithCredentials(userId, teamIds);
  },
  ["appRegistry.getWithCredentials"],
  { revalidate: 3600 } // Cache for 1 hour
);

const getCachedUserAdminTeams = unstable_cache(
  async (userId: number) => {
    return await UserRepository.getUserAdminTeams(userId);
  },
  ["user.getAdminTeams"],
  { revalidate: 3600 } // Cache for 1 hour
);

const ServerPage = async () => {
  const req = buildLegacyRequest(await headers(), await cookies());
  const session = await getServerSession({ req });
  let appStore, userAdminTeamsIds: number[];
  if (session?.user?.id) {
    const userAdminTeams = await getCachedUserAdminTeams(session.user.id);
    userAdminTeamsIds = userAdminTeams?.teams?.map(({ team }) => team.id) ?? [];
    appStore = await getCachedAppRegistryWithCredentials(session.user.id, userAdminTeamsIds);
  } else {
    appStore = await getCachedAppRegistry();
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
  const props = {
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
  };
  return <AppsPage {...props} isAdmin={session?.user?.role === "ADMIN"} />;
};
export default ServerPage;
