import type { GetServerSidePropsContext } from "next";
import type { ChangeEventHandler } from "react";
import { useState } from "react";

import { getLayout } from "@calcom/features/MainLayout";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { HorizontalTabItemProps } from "@calcom/ui";
import {
  AllApps,
  AppStoreCategories,
  HorizontalTabs,
  TextField,
  PopularAppsSlider,
  RecentAppsSlider,
} from "@calcom/ui";
import { Search } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import AppsLayout from "@components/apps/layouts/AppsLayout";

import { ssrInit } from "@server/lib/ssr";

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
      className="bg-subtle !border-muted !pl-0 focus:!ring-offset-0"
      addOnLeading={<Search className="text-subtle h-4 w-4" />}
      addOnClassname="!border-muted"
      containerClassName={classNames("focus:!ring-offset-0 m-1", className)}
      type="search"
      autoComplete="false"
      onChange={onChange}
    />
  );
}

export default function Apps() {
  const { t } = useLocale();

  const [searchText, setSearchText] = useState<string | undefined>(undefined);

  // TODO: Consider implementing useInfinityQuery and intersection observer to infinitely scroll "All Apps".
  // This would require seperating calls for popular and recently used so those filters are represented
  // correctly in the frontend
  const { data } = trpc.viewer.appsRouter.getAppData.useQuery();

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
      emptyStore={!data?.appStore.length}>
      <div className="flex flex-col gap-y-8">
        {!searchText && (
          <>
            <AppStoreCategories categories={data?.categories || []} />
            <PopularAppsSlider items={data?.appStore || []} />
            <RecentAppsSlider items={data?.appStore || []} />
          </>
        )}
        <AllApps
          apps={data?.appStore || []}
          searchText={searchText}
          categories={data?.categories.map((category) => category.name) ?? []}
          userAdminTeams={data?.userAdminTeams}
        />
      </div>
    </AppsLayout>
  );
}

Apps.PageWrapper = PageWrapper;
Apps.getLayout = getLayout;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  await ssr.viewer.appsRouter.getAppData.prefetch();

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};
