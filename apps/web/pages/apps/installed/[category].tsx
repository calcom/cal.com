"use client";

import { useReducer } from "react";

import getAppCategoryTitle from "@calcom/app-store/_utils/getAppCategoryTitle";
import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { AppCategories } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { Icon } from "@calcom/ui";
import { AppSkeletonLoader as SkeletonLoader, Button, EmptyScreen, ShellSubHeading } from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";
import type { querySchemaType } from "@lib/apps/installed/[category]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import { AppList } from "@components/apps/AppList";
import { CalendarListContainer } from "@components/apps/CalendarListContainer";
import InstalledAppsLayout from "@components/apps/layouts/InstalledAppsLayout";

interface IntegrationsContainerProps {
  variant?: AppCategories;
  exclude?: AppCategories[];
  handleDisconnect: (credentialId: number) => void;
}

const IntegrationsContainer = ({
  variant,
  exclude,
  handleDisconnect,
}: IntegrationsContainerProps): JSX.Element => {
  const { t } = useLocale();
  const query = trpc.viewer.integrations.useQuery({
    variant,
    exclude,
    onlyInstalled: true,
    includeTeamInstalledApps: true,
  });

  // TODO: Refactor and reuse getAppCategories?
  const emptyIcon: Record<AppCategories, React.ComponentProps<typeof Icon>["name"]> = {
    calendar: "calendar",
    conferencing: "video",
    automation: "share-2",
    analytics: "bar-chart",
    payment: "credit-card",
    other: "grid-3x3",
    web3: "credit-card", // deprecated
    video: "video", // deprecated
    messaging: "mail",
    crm: "contact",
  };

  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader />}
      success={({ data }) => {
        if (!data.items.length) {
          const emptyHeaderCategory = getAppCategoryTitle(variant || "other", true);

          return (
            <EmptyScreen
              Icon={emptyIcon[variant || "other"]}
              headline={t("no_category_apps", {
                category: emptyHeaderCategory,
              })}
              description={t(`no_category_apps_description_${variant || "other"}`)}
              buttonRaw={
                <Button
                  color="secondary"
                  data-testid={`connect-${variant || "other"}-apps`}
                  href={variant ? `/apps/categories/${variant}` : "/apps/categories/other"}>
                  {t(`connect_${variant || "other"}_apps`)}
                </Button>
              }
            />
          );
        }
        return (
          <div className="border-subtle rounded-md border p-7">
            <ShellSubHeading
              title={t(variant || "other")}
              subtitle={t(`installed_app_${variant || "other"}_description`)}
              className="mb-6"
              actions={
                <Button
                  data-testid="add-apps"
                  href={variant ? `/apps/categories/${variant}` : "/apps"}
                  color="secondary"
                  StartIcon="plus">
                  {t("add")}
                </Button>
              }
            />

            <AppList handleDisconnect={handleDisconnect} data={data} variant={variant} />
          </div>
        );
      }}
    />
  );
};

type ModalState = {
  isOpen: boolean;
  credentialId: null | number;
  teamId?: number;
};

export default function InstalledApps() {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const category = searchParams?.get("category") as querySchemaType["category"];
  const categoryList: AppCategories[] = Object.values(AppCategories).filter((category) => {
    // Exclude calendar and other from categoryList, we handle those slightly differently below
    return !(category in { other: null, calendar: null });
  });

  const [data, updateData] = useReducer(
    (data: ModalState, partialData: Partial<ModalState>) => ({ ...data, ...partialData }),
    {
      isOpen: false,
      credentialId: null,
    }
  );

  const handleModelClose = () => {
    updateData({ isOpen: false, credentialId: null });
  };

  const handleDisconnect = (credentialId: number, teamId?: number) => {
    updateData({ isOpen: true, credentialId, teamId });
  };

  return (
    <>
      <InstalledAppsLayout heading={t("installed_apps")} subtitle={t("manage_your_connected_apps")}>
        {categoryList.includes(category) && (
          <IntegrationsContainer handleDisconnect={handleDisconnect} variant={category} />
        )}
        {category === "calendar" && <CalendarListContainer />}
        {category === "other" && (
          <IntegrationsContainer
            handleDisconnect={handleDisconnect}
            variant={category}
            exclude={[...categoryList, "calendar"]}
          />
        )}
      </InstalledAppsLayout>
      <DisconnectIntegrationModal
        handleModelClose={handleModelClose}
        isOpen={data.isOpen}
        credentialId={data.credentialId}
        teamId={data.teamId}
      />
    </>
  );
}

export { getServerSideProps } from "@lib/apps/installed/[category]/getServerSideProps";

InstalledApps.PageWrapper = PageWrapper;
