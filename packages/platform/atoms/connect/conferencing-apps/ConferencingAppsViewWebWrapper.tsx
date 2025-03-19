"use client";

import { useReducer, Suspense } from "react";

import { AppList } from "@calcom/features/apps/components/AppList";
import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { SkeletonText, SkeletonContainer } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

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

const InstalledConferencingApps = ({
  disconnectIntegrationModalCtrl,
}: {
  disconnectIntegrationModalCtrl: ReturnType<typeof useDisconnectIntegrationModalController>;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: defaultConferencingApp } = trpc.viewer.apps.getUsersDefaultConferencingApp.useQuery();

  const updateDefaultAppMutation = trpc.viewer.apps.updateUserDefaultConferencingApp.useMutation();

  const updateLocationsMutation = trpc.viewer.eventTypes.bulkUpdateToDefaultLocation.useMutation();

  const { data: eventTypesQueryData, isFetching: isEventTypesFetching } =
    trpc.viewer.eventTypes.bulkEventFetch.useQuery();

  const [result] = trpc.viewer.apps.integrations.useSuspenseQuery({
    variant: "conferencing",
    onlyInstalled: true,
  });

  const handleConnectDisconnectIntegrationMenuToggle = () => {
    utils.viewer.apps.integrations.invalidate();
  };

  const handleBulkEditDialogToggle = () => {
    utils.viewer.apps.getUsersDefaultConferencingApp.invalidate();
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
          utils.viewer.apps.getUsersDefaultConferencingApp.invalidate();
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
          utils.viewer.apps.getUsersDefaultConferencingApp.invalidate();
          callback();
        },
      }
    );
  };

  if (result.items.length === 0) {
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
      handleDisconnect={disconnectIntegrationModalCtrl.disconnect}
      data={result}
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
};

type ModalState = {
  isOpen: boolean;
  credentialId: null | number;
};

const useDisconnectIntegrationModalController = () => {
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

  const isModalOpen = () => modal.isOpen;

  return {
    isModalOpen,
    credentialId: modal.credentialId,
    close: handleModelClose,
    disconnect: handleDisconnect,
  };
};

export const ConferencingAppsViewWebWrapper = ({
  title,
  description,
  add,
}: ConferencingAppsViewWebWrapperProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const deleteCredentialMutation = trpc.viewer.deleteCredential.useMutation();

  const handleRemoveApp = ({ credentialId, teamId, callback }: RemoveAppParams) => {
    deleteCredentialMutation.mutate(
      { id: credentialId, teamId },
      {
        onSuccess: () => {
          showToast(t("app_removed_successfully"), "success");
          callback();
          utils.viewer.apps.integrations.invalidate();
          utils.viewer.connectedCalendars.invalidate();
        },
        onError: () => {
          showToast(t("error_removing_app"), "error");
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

  const disconnectIntegrationModalCtrl = useDisconnectIntegrationModalController();

  return (
    <SettingsHeader
      title={title}
      description={description}
      CTA={<AddConferencingButton />}
      borderInShellHeader={true}>
      <>
        <div className="bg-default w-full sm:mx-0 xl:mt-0">
          <Suspense fallback={<SkeletonLoader />}>
            <InstalledConferencingApps disconnectIntegrationModalCtrl={disconnectIntegrationModalCtrl} />
          </Suspense>
        </div>
        <DisconnectIntegrationModal
          handleModelClose={disconnectIntegrationModalCtrl.close}
          isOpen={disconnectIntegrationModalCtrl.isModalOpen()}
          credentialId={disconnectIntegrationModalCtrl.credentialId}
          handleRemoveApp={handleRemoveApp}
        />
      </>
    </SettingsHeader>
  );
};
