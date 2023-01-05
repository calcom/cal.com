import { GetServerSidePropsContext } from "next";
import { ChangeEventHandler, useState } from "react";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { classNames } from "@calcom/lib";
import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/client";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { AllApps, AppStoreCategories, Icon, TextField, TrendingAppsSlider } from "@calcom/ui";

import AppsLayout from "@components/apps/layouts/AppsLayout";

import { ssgInit } from "@server/lib/ssg";

function AppsSearch({
  onChange,
  className,
}: {
  onChange: ChangeEventHandler<HTMLInputElement>;
  className?: string;
}) {
  return (
    <TextField
      className="!border-gray-100 bg-gray-100 !pl-0 focus:!ring-offset-0"
      addOnLeading={<Icon.FiSearch className="h-4 w-4 text-gray-500" />}
      addOnClassname="!border-gray-100"
      containerClassName={classNames("focus:!ring-offset-0", className)}
      type="search"
      autoComplete="false"
      onChange={onChange}
    />
  );
}

export default function Apps({ categories, appStore }: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const [searchText, setSearchText] = useState<string | undefined>(undefined);

  return (
    <AppsLayout
      isPublic
      heading={t("app_store")}
      subtitle={t("app_store_description")}
      actions={(className) => (
        <AppsSearch className={className} onChange={(e) => setSearchText(e.target.value)} />
      )}
      emptyStore={!appStore.length}>
      {!searchText && (
        <>
          <AppStoreCategories categories={categories} />
          <TrendingAppsSlider items={appStore} />
        </>
      )}
      <AllApps
        apps={appStore}
        searchText={searchText}
        categories={categories.map((category) => category.name)}
      />
    </AppsLayout>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
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
      categories: Object.entries(categories)
        .map(([name, count]): { name: AppCategories; count: number } => ({
          name: name as AppCategories,
          count,
        }))
        .sort(function (a, b) {
          return b.count - a.count;
        }),
      appStore,
      trpcState: ssg.dehydrate(),
    },
  };
};
