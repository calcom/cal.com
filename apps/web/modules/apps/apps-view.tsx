"use client";

import type { ChangeEventHandler } from "react";
import { useState } from "react";

import { AllApps } from "@calcom/web/modules/apps/components/AllApps";
import { AppStoreCategories } from "@calcom/web/modules/apps/components/Categories";
import { PopularAppsSlider } from "@calcom/web/modules/apps/components/PopularAppsSlider";
import { RecentAppsSlider } from "@calcom/web/modules/apps/components/RecentAppsSlider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/enums";
import type { AppFrontendPayload } from "@calcom/types/App";
import classNames from "@calcom/ui/classNames";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import type { HorizontalTabItemProps } from "@calcom/ui/components/navigation";
import { HorizontalTabs } from "@calcom/ui/components/navigation";

import AppsLayout from "@components/apps/layouts/AppsLayout";

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
  const { t } = useLocale();
  return (
    <TextField
      addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
      addOnClassname="!border-muted"
      containerClassName={classNames("focus:ring-offset-0! m-1", className)}
      type="search"
      autoComplete="false"
      onChange={onChange}
      placeholder={t("search")}
    />
  );
}

export type PageProps = {
  categories: {
    name: AppCategories;
    count: number;
  }[];
  appStore: AppFrontendPayload[];
  userAdminTeams: number[];
  isAdmin: boolean;
};

export default function Apps({ isAdmin, categories, appStore, userAdminTeams }: PageProps) {
  const { t } = useLocale();
  const [searchText, setSearchText] = useState<string | undefined>(undefined);

  return (
    <AppsLayout
      isPublic
      isAdmin={isAdmin}
      heading={t("app_store")}
      subtitle={t("app_store_description")}
      actions={(className) => (
        <div className="flex w-full flex-col pt-4 md:flex-row md:justify-between md:pt-0 lg:w-auto">
          <div className="ltr:mr-2 rtl:ml-2 lg:hidden">
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
            <RecentAppsSlider items={appStore} />
          </>
        )}
        <AllApps
          apps={appStore}
          searchText={searchText}
          categories={categories.map((category) => category.name)}
          userAdminTeams={userAdminTeams}
        />
      </div>
    </AppsLayout>
  );
}
