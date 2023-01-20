import { GetServerSidePropsContext } from "next";
import { ChangeEventHandler, useState } from "react";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { classNames } from "@calcom/lib";
import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/client";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import {
  AllApps,
  AppStoreCategories,
  HorizontalTabItemProps,
  HorizontalTabs,
  Icon,
  TextField,
  PopularAppsSlider,
} from "@calcom/ui";

import AppsLayout from "@components/apps/layouts/AppsLayout";

import { ssgInit } from "@server/lib/ssg";

const tabs: HorizontalTabItemProps[] = [
  {
    name: "app_store",
    href: "/apps",
  },
  {
    name: "installed_apps",
    href: "/apps/installed",
  },
];

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
        <div className="flex w-full flex-col  md:flex-row md:justify-between lg:w-auto">
          <div className="lg:hidden">
            <HorizontalTabs tabs={tabs} />
          </div>
          <div>
            <AppsSearch className={className} onChange={(e) => setSearchText(e.target.value)} />
          </div>
        </div>
      )}
      headerClassName="sm:hidden lg:block hidden"
      emptyStore={!appStore.length}>
      <div className="flex flex-col gap-y-8">
        {!searchText && (
          <>
            <AppStoreCategories categories={categories} />
            <PopularAppsSlider items={appStore} />
          </>
        )}
        <AllApps
          apps={appStore}
          searchText={searchText}
          categories={categories.map((category) => category.name)}
        />
      </div>
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
