"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast } from "@calcom/ui";
import ConferencingView from "@calcom/web/modules/settings/my-account/conferencing-view";

type ConferencingAppsViewWebWrapperProps = {
  title: string;
  description: string;
  add: string;
};

export type HandleRemoveAppParams = { credentialId: number; teamId?: number; callback: () => void };
export type HandleUpdateDefaultConferencingAppParams = { appSlug: string; callback: () => void };
export type HandleBulkUpdateDefaultLocationParams = { eventTypeIds: number[]; callback: () => void };

export const ConferencingAppsViewWebWrapper = ({
  title,
  description,
  add,
}: ConferencingAppsViewWebWrapperProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const installedIntegrationsQuery = trpc.viewer.integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: true,
  });

  const { data: defaultConferencingApp } = trpc.viewer.getUsersDefaultConferencingApp.useQuery();

  const deleteCredentialMutation = trpc.viewer.deleteCredential.useMutation();

  const updateDefaultAppMutation = trpc.viewer.updateUserDefaultConferencingApp.useMutation();

  const updateLocationsMutation = trpc.viewer.eventTypes.bulkUpdateToDefaultLocation.useMutation();

  const handleRemoveApp = ({ credentialId, teamId, callback }: HandleRemoveAppParams) => {
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

  const handleUpdateDefaultConferencingApp = ({
    appSlug,
    callback,
  }: HandleUpdateDefaultConferencingAppParams) => {
    updateDefaultAppMutation.mutate(
      { appSlug },
      {
        onSuccess: () => {
          showToast("Default app updated successfully", "success");
          utils.viewer.getUsersDefaultConferencingApp.invalidate();
          callback();
        },
        onError: (error) => {
          showToast(`Error: ${error.message}`, "error");
        },
      }
    );
  };

  const handleBulkUpdateDefaultLocation = ({
    eventTypeIds,
    callback,
  }: HandleBulkUpdateDefaultLocationParams) => {
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
      <ConferencingView
        installedIntegrationsQueryData={installedIntegrationsQuery?.data}
        isInstalledIntegrationsQueryPending={installedIntegrationsQuery?.isPending}
        defaultConferencingApp={defaultConferencingApp}
        handleRemoveApp={handleRemoveApp}
        handleUpdateDefaultConferencingApp={handleUpdateDefaultConferencingApp}
        handleBulkUpdateDefaultLocation={handleBulkUpdateDefaultLocation}
        isBulkUpdateDefaultLocationPending={updateLocationsMutation.isPending}
      />
    </SettingsHeader>
  );
};
