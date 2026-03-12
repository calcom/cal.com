import { _generateMetadata } from "app/_utils";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
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

const ServerPage = async ({ searchParams: _searchParams }: Pick<PageProps, "searchParams">) => {
  const searchParams = await _searchParams;
  const req = buildLegacyRequest(await headers(), await cookies());
  const session = await getServerSession({ req });
  let appStore, userAdminTeamsIds: number[];
  if (session?.user?.id) {
    const userRepo = new UserRepository(prisma);
    const userAdminTeams = await userRepo.getUserAdminTeams({ userId: session.user.id });
    const userCalIdAdminTeams = await userRepo.getUserCalIdAdminTeams({ userId: session.user.id });
    const legacyTeamIds = userAdminTeams?.teams?.map(({ team }) => team.id) ?? [];
    const calIdTeamIds = userCalIdAdminTeams?.calIdTeams?.map(({ calIdTeam }) => calIdTeam.id) ?? [];
    userAdminTeamsIds = [...legacyTeamIds, ...calIdTeamIds];
    appStore = await getAppRegistryWithCredentials(session.user.id, legacyTeamIds, calIdTeamIds);
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
  const requestedCategory = Array.isArray(searchParams?.category)
    ? searchParams.category[0]
    : searchParams?.category;
  const selectedCategory =
    typeof requestedCategory === "string" && Object.hasOwn(categories, requestedCategory)
      ? (requestedCategory as AppCategories)
      : null;

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
    selectedCategory,
  };
  return <AppsPage {...props} isAdmin={session?.user?.role === "ADMIN"} />;
};

export default ServerPage;
