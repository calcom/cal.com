"use client";

import { useReducer } from "react";

import getAppCategoryTitle from "@calcom/app-store/_utils/getAppCategoryTitle";
import { AppList, type HandleDisconnect } from "@calcom/features/apps/components/AppList";
import type { UpdateUsersDefaultConferencingAppParams } from "@calcom/features/apps/components/AppSetDefaultLinkDialog";
import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import type { RemoveAppParams } from "@calcom/features/apps/components/DisconnectIntegrationModal";
import type { BulkUpdatParams } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { AppCategories } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import type { Icon } from "@calcom/ui";
import {
  AppSkeletonLoader as SkeletonLoader,
  Button,
  EmptyScreen,
  ShellSubHeading,
  showToast,
} from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";
import type { querySchemaType, getServerSideProps } from "@lib/apps/installed/[category]/getServerSideProps";

import { CalendarListContainer } from "@components/apps/CalendarListContainer";
import InstalledAppsLayout from "@components/apps/layouts/InstalledAppsLayout";

interface IntegrationsContainerProps {
  variant?: AppCategories;
  exclude?: AppCategories[];
  handleDisconnect: HandleDisconnect;
}

const IntegrationsContainer = ({
  variant,
  exclude,
  handleDisconnect,
}: IntegrationsContainerProps): JSX.Element => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const query = trpc.viewer.integrations.useQuery({
    variant,
    exclude,
    onlyInstalled: true,
    includeTeamInstalledApps: true,
  });

  const { data: defaultConferencingApp } = trpc.viewer.getUsersDefaultConferencingApp.useQuery();

  const updateDefaultAppMutation = trpc.viewer.updateUserDefaultConferencingApp.useMutation();

  const updateLocationsMutation = trpc.viewer.eventTypes.bulkUpdateToDefaultLocation.useMutation();

  const { data: eventTypesQueryData, isFetching: isEventTypesFetching } =
    trpc.viewer.eventTypes.bulkEventFetch.useQuery();

  const handleUpdateUserDefaultConferencingApp = ({
    appSlug,
    onSuccessCallback,
    onErrorCallback,
  }: UpdateUsersDefaultConferencingAppParams) => {
    updateDefaultAppMutation.mutate(
      { appSlug },
      {
        onSuccess: () => {
          showToast("Default app updated successfully", "success");
          utils.viewer.getUsersDefaultConferencingApp.invalidate();
          onSuccessCallback();
        },
        onError: (error) => {
          showToast(`Error: ${error.message}`, "error");
          onErrorCallback();
        },
      }
    );
  };

  const handleBulkUpdateDefaultLocation = ({ eventTypeIds, callback }: BulkUpdatParams) => {
    updateLocationsMutation.mutate(
      {
        eventTypeIds,
      },
      {
        onSuccess: () => {
          utils.viewer.getUsersDefaultConferencingApp.invalidate();
          callback();
        },
      }
    );
  };

  const handleConnectDisconnectIntegrationMenuToggle = () => {
    utils.viewer.integrations.invalidate();
  };

  const handleBulkEditDialogToggle = () => {
    utils.viewer.getUsersDefaultConferencingApp.invalidate();
  };

  // TODO: Refactor and reuse getAppCategories?
  const emptyIcon: Record<AppCategories, React.ComponentProps<typeof Icon>["name"]> = {
    calendar: "calendar",
    conferencing: "video",
    automation: "share-2",
    analytics: "chart-bar",
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

            <AppList
              handleDisconnect={handleDisconnect}
              data={data}
              variant={variant}
              defaultConferencingApp={defaultConferencingApp}
              handleUpdateUserDefaultConferencingApp={handleUpdateUserDefaultConferencingApp}
              handleBulkUpdateDefaultLocation={handleBulkUpdateDefaultLocation}
              isBulkUpdateDefaultLocationPending={updateDefaultAppMutation.isPending}
              eventTypes={eventTypesQueryData?.eventTypes}
              isEventTypesFetching={isEventTypesFetching}
              handleConnectDisconnectIntegrationMenuToggle={handleConnectDisconnectIntegrationMenuToggle}
              handleBulkEditDialogToggle={handleBulkEditDialogToggle}
            />
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

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function InstalledApps(props: PageProps) {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const utils = trpc.useUtils();
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

  const handleDisconnect = (credentialId: number, app: string, teamId?: number) => {
    updateData({ isOpen: true, credentialId, teamId });
  };

  const deleteCredentialMutation = trpc.viewer.deleteCredential.useMutation();

  const handleRemoveApp = ({ credentialId, teamId, callback }: RemoveAppParams) => {
    deleteCredentialMutation.mutate(
      { id: credentialId, teamId },
      {
        onSuccess: () => {
          showToast(t("app_removed_successfully"), "success");
          callback();
          utils.viewer.integrations.invalidate();
          utils.viewer.connectedCalendars.invalidate();
        },
        onError: () => {
          showToast(t("error_removing_app"), "error");
          callback();
        },
      }
    );
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
        handleRemoveApp={handleRemoveApp}
      />
    </>
  );
}
