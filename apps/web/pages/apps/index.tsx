"use client";

import type { ChangeEventHandler } from "react";
import { useState } from "react";

import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import type { HorizontalTabItemProps } from "@calcom/ui";
import {
  AllApps,
  AppStoreCategories,
  HorizontalTabs,
  TextField,
  PopularAppsSlider,
  RecentAppsSlider,
} from "@calcom/ui";
import { Icon } from "@calcom/ui";

import { getServerSideProps } from "@lib/apps/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
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
      className="bg-subtle !border-muted !pl-0 focus:!ring-offset-0"
      addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
      addOnClassname="!border-muted"
      containerClassName={classNames("focus:!ring-offset-0 m-1", className)}
      type="search"
      autoComplete="false"
      onChange={onChange}
      placeholder={t("search")}
    />
  );
}

export default function Apps({
  categories,
  appStore,
  userAdminTeams,
}: Omit<inferSSRProps<typeof getServerSideProps>, "trpcState">) {
  const { t } = useLocale();
  const [searchText, setSearchText] = useState<string | undefined>(undefined);

  return (
    <AppsLayout
      isPublic
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

export { getServerSideProps };

Apps.PageWrapper = PageWrapper;
Apps.getLayout = (page: React.ReactElement) => {
  return (
    <Shell
      title="Apps Store"
      description="Create forms to direct attendees to the correct destinations."
      withoutMain={true}
      hideHeadingOnMobile>
      {page}
    </Shell>
  );
};
