import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import type { UserAdminTeams } from "@calcom/ee/teams/lib/getUserAdminTeams";
import getUserAdminTeams from "@calcom/ee/teams/lib/getUserAdminTeams";
import type { AppCategories } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";
import type { GetAppDataSchemaType } from "./getAppData.schema";

type getAppData = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: GetAppDataSchemaType;
};

export async function getAppDataHandler({ ctx, input }: getAppData) {
  let appStore, userAdminTeams: UserAdminTeams;
  if (ctx.user.id) {
    userAdminTeams = await getUserAdminTeams({ userId: ctx.user.id, getUserInfo: true });
    appStore = await getAppRegistryWithCredentials(ctx.user.id, userAdminTeams, input);
  } else {
    appStore = await getAppRegistry(input);
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
  };
}
