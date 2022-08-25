import { InferGetStaticPropsType } from "next";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/client";
import AppsLayout from "@calcom/ui/v2/core/layouts/AppsLayout";

import AllApps from "@components/apps/AllApps";
import AppStoreCategories from "@components/apps/Categories";

export default function Apps({ appStore, categories }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useLocale();

  return (
    <AppsLayout heading={t("app_store")} subtitle={t("app_store_description")}>
      <AppStoreCategories categories={categories} />
      <AllApps apps={appStore} />
    </AppsLayout>
  );
}

export const getStaticProps = async () => {
  const appStore = await getAppRegistry();

  const categoryQuery = await prisma.app.findMany({
    select: {
      categories: true,
    },
  });
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
        })
        .slice(0, 3),
      appStore,
    },
  };
};
