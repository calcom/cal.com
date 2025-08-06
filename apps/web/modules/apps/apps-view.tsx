"use client";

import { AllApps } from "@calcom/features/apps/components/AllApps";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/enums";
import type { AppFrontendPayload } from "@calcom/types/App";

import AppsLayout from "@components/apps/layouts/AppsLayout";

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

  return (
    <AppsLayout
      isPublic
      isAdmin={isAdmin}
      heading={t("app_store")}
      subtitle={t("app_store_description")}
      headerClassName="sm:hidden lg:block hidden"
      emptyStore={!appStore.length}>
      <div className="flex flex-col gap-y-8">
        <AllApps
          apps={appStore}
          categories={categories.map((category) => category.name)}
          userAdminTeams={userAdminTeams}
        />
      </div>
    </AppsLayout>
  );
}
