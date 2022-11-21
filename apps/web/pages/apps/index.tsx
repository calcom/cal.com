import { InferGetStaticPropsType, NextPageContext } from "next";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/client";
import AllApps from "@calcom/ui/v2/core/apps/AllApps";
import AppStoreCategories from "@calcom/ui/v2/core/apps/Categories";
import TrendingAppsSlider from "@calcom/ui/v2/core/apps/TrendingAppsSlider";
import AppsLayout from "@calcom/ui/v2/core/layouts/AppsLayout";

import { ssgInit } from "@server/lib/ssg";

export default function Apps({ appStore, categories }: InferGetStaticPropsType<typeof getServerSideProps>) {
  const { t } = useLocale();

  return (
    <AppsLayout isPublic heading={t("app_store")} subtitle={t("app_store_description")}>
      <AppStoreCategories categories={categories} />
      <TrendingAppsSlider items={appStore} />
      <AllApps apps={appStore} />
    </AppsLayout>
  );
}

export const getServerSideProps = async (context: NextPageContext) => {
  const ssg = await ssgInit(context);

  const session = await getSession(context);

  let appStore;
  if (session?.user?.id) {
    appStore = await getAppRegistryWithCredentials(session.user.id);
  } else {
    appStore = await getAppRegistry();
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
      trpcState: ssg.dehydrate(),
      categories: Object.entries(categories)
        .map(([name, count]): { name: AppCategories; count: number } => ({
          name: name as AppCategories,
          count,
        }))
        .sort(function (a, b) {
          return b.count - a.count;
        }),
      appStore,
    },
  };
};
