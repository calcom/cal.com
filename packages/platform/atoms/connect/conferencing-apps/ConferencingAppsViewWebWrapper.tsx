"use client";

import { useReducer } from "react";

import { AppList } from "@calcom/features/apps/components/AppList";
import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { QueryCell } from "@calcom/trpc/components/QueryCell";
import { trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen, showToast, SkeletonContainer, SkeletonText } from "@calcom/ui";

type ConferencingAppsViewWebWrapperProps = {
  title: string;
  description: string;
  add: string;
};

export type UpdateUsersDefaultConferencingAppParams = {
  appSlug: string;
  appLink?: string;
  onSuccessCallback: () => void;
  onErrorCallback: () => void;
};

export type BulkUpdatParams = { eventTypeIds: number[]; callback: () => void };
type RemoveAppParams = { credentialId: number; teamId?: number; callback: () => void };

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle border-subtle space-y-6 rounded-b-lg border border-t-0 px-6 py-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

type ModalState = {
  isOpen: boolean;
  credentialId: null | number;
};

export const ConferencingAppsViewWebWrapper = ({
  title,
  description,
  add,
}: ConferencingAppsViewWebWrapperProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [modal, updateModal] = useReducer(
    (data: ModalState, partialData: Partial<ModalState>) => ({ ...data, ...partialData }),
    {
      isOpen: false,
      credentialId: null,
    }
  );

  const handleModelClose = () => {
    updateModal({ isOpen: false, credentialId: null });
  };

  const handleDisconnect = (credentialId: number) => {
    updateModal({ isOpen: true, credentialId });
  };

  const installedIntegrationsQuery = trpc.viewer.integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: true,
  });

  const { data: defaultConferencingApp } = trpc.viewer.getUsersDefaultConferencingApp.useQuery();

  const deleteCredentialMutation = trpc.viewer.deleteCredential.useMutation();

  const updateDefaultAppMutation = trpc.viewer.updateUserDefaultConferencingApp.useMutation();

  const updateLocationsMutation = trpc.viewer.eventTypes.bulkUpdateToDefaultLocation.useMutation();

  const { data: eventTypesQueryData, isFetching: isEventTypesFetching } =
    trpc.viewer.eventTypes.bulkEventFetch.useQuery();

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

  const handleConnectDisconnectIntegrationMenuToggle = () => {
    utils.viewer.integrations.invalidate();
  };

  const handleBulkEditDialogToggle = () => {
    utils.viewer.getUsersDefaultConferencingApp.invalidate();
  };

  const handleUpdateUserDefaultConferencingApp = ({
    appSlug,
    appLink,
    onSuccessCallback,
    onErrorCallback,
  }: UpdateUsersDefaultConferencingAppParams) => {
    updateDefaultAppMutation.mutate(
      { appSlug, appLink },
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

  const AddConferencingButton = () => {
    return (
      <Button color="secondary" StartIcon="plus" href="/apps/categories/conferencing">
        {add}
      </Button>
    );
  };

  return (
    <SettingsHeader
      title={title}
      description={description}
      CTA={<AddConferencingButton />}
      borderInShellHeader={true}>
      <>
        <div className="bg-default w-full sm:mx-0 xl:mt-0">
          <QueryCell
            query={installedIntegrationsQuery}
            customLoader={<SkeletonLoader />}
            success={({ data }) => {
              if (!data.items.length) {
                return (
                  <EmptyScreen
                    Icon="calendar"
                    headline={t("no_category_apps", {
                      category: t("conferencing").toLowerCase(),
                    })}
                    description={t("no_category_apps_description_conferencing")}
                    buttonRaw={
                      <Button
                        color="secondary"
                        data-testid="connect-conferencing-apps"
                        href="/apps/categories/conferencing">
                        {t("connect_conference_apps")}
                      </Button>
                    }
                  />
                );
              }
              return (
                <AppList
                  listClassName="rounded-lg rounded-t-none border-t-0 max-w-full"
                  handleDisconnect={handleDisconnect}
                  data={data}
                  variant="conferencing"
                  defaultConferencingApp={defaultConferencingApp}
                  handleUpdateUserDefaultConferencingApp={handleUpdateUserDefaultConferencingApp}
                  handleBulkUpdateDefaultLocation={handleBulkUpdateDefaultLocation}
                  isBulkUpdateDefaultLocationPending={updateDefaultAppMutation.isPending}
                  eventTypes={eventTypesQueryData?.eventTypes}
                  isEventTypesFetching={isEventTypesFetching}
                  handleConnectDisconnectIntegrationMenuToggle={handleConnectDisconnectIntegrationMenuToggle}
                  handleBulkEditDialogToggle={handleBulkEditDialogToggle}
                />
              );
            }}
          />
        </div>
        <DisconnectIntegrationModal
          handleModelClose={handleModelClose}
          isOpen={modal.isOpen}
          credentialId={modal.credentialId}
          handleRemoveApp={handleRemoveApp}
        />
      </>
    </SettingsHeader>
  );
};
