"use client";

import { useReducer } from "react";

import { AppList } from "@calcom/features/apps/components/AppList";
import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { QueryCell } from "@calcom/trpc/components/QueryCell";
import type { App } from "@calcom/types/App";
import {
  Button,
  SkeletonContainer,
  SkeletonText,
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  EmptyScreen,
} from "@calcom/ui";

import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { useToast } from "../../src/components/ui/use-toast";
import { useAtomsGetInstalledConferencingApps } from "./hooks/useAtomsGetInstalledConferencingApps";
import { useConnect } from "./hooks/useConnect";
import { useDeleteCredential } from "./hooks/useDeleteCredential";
import { useGetDefaultConferencingApp } from "./hooks/useGetDefaultConferencingApp";
import { useUpdateUserDefaultConferencingApp } from "./hooks/useUpdateUserDefaultConferencingApp";

type ConferencingAppsViewPlatformWrapperProps = {
  title: string;
  description: string;
  add: string;
  disableToasts?: boolean;
};

type UpdateDefaultConferencingAppParams = {
  appSlug: string;
  callback: () => void;
};
type BulkUpdatParams = { eventTypeIds: number[]; callback: () => void };
type RemoveAppParams = { credentialId: number; teamId?: number; callback: () => void; app: App["slug"] };

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
  app: App["slug"] | null;
};

export const ConferencingAppsViewPlatformWrapper = ({
  title,
  description,
  add,
  disableToasts = false,
}: ConferencingAppsViewPlatformWrapperProps) => {
  const { t } = useLocale();
  // const utils = trpc.useUtils();
  const { toast } = useToast();

  const showToast = (message: string, variant: "success" | "warning" | "error") => {
    if (!disableToasts) {
      toast({ description: message });
    }
  };

  const [modal, updateModal] = useReducer(
    (data: ModalState, partialData: Partial<ModalState>) => ({ ...data, ...partialData }),
    {
      isOpen: false,
      credentialId: null,
      app: null,
    }
  );

  const handleModelClose = () => {
    updateModal({ isOpen: false, credentialId: null, app: null });
  };

  const handleDisconnect = (credentialId: number, app: App["slug"], teamId?: number) => {
    updateModal({ isOpen: true, credentialId, app });
  };

  const installedIntegrationsQuery = useAtomsGetInstalledConferencingApps();
  const { data: defaultConferencingApp } = useGetDefaultConferencingApp();

  const deleteCredentialMutation = useDeleteCredential({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      handleModelClose();
      // utils.viewer.integrations.invalidate();
      // utils.viewer.connectedCalendars.invalidate();
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      handleModelClose();
    },
  });

  const updateDefaultAppMutation = useUpdateUserDefaultConferencingApp({
    onSuccess: () => {
      return;
    },
    onError: () => {
      return;
    },
  });

  // const updateLocationsMutation = trpc.viewer.eventTypes.bulkUpdateToDefaultLocation.useMutation();

  const handleRemoveApp = ({ app }: RemoveAppParams) => {
    deleteCredentialMutation.mutate(app);
  };

  const handleUpdateDefaultConferencingApp = ({ appSlug, callback }: UpdateDefaultConferencingAppParams) => {
    updateDefaultAppMutation.mutate(appSlug, {
      onSuccess: () => {
        showToast("Default app updated successfully", "success");
        // utils.viewer.getUsersDefaultConferencingApp.invalidate();
        callback();
      },
      onError: (error) => {
        showToast(`Error: ${error.message}`, "error");
      },
    });
  };

  const handleBulkUpdateDefaultLocation = ({ eventTypeIds, callback }: BulkUpdatParams) => {
    return;
    // updateLocationsMutation.mutate(
    //   {
    //     eventTypeIds,
    //   },
    //   {
    //     onSuccess: () => {
    //       utils.viewer.getUsersDefaultConferencingApp.invalidate();
    //       callback();
    //     },
    //   }
    // );
  };

  const { connect } = useConnect();
  const AddConferencingButtonPlatform = () => {
    return (
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <Button color="secondary" StartIcon="plus">
            {add}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <DropdownItem color="secondary" className="disabled:opacity-40">
              {t("google meet")}
            </DropdownItem>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <DropdownItem color="secondary" className="disabled:opacity-40" onClick={() => connect()}>
              {t("zoom")}
            </DropdownItem>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <DropdownItem color="secondary" className="disabled:opacity-40">
              {t("cal video")}
            </DropdownItem>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </Dropdown>
    );
  };

  return (
    <AtomsWrapper>
      <SettingsHeader
        title={title}
        description={description}
        CTA={<AddConferencingButtonPlatform />}
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
                    handleUpdateDefaultConferencingApp={handleUpdateDefaultConferencingApp}
                    handleBulkUpdateDefaultLocation={handleBulkUpdateDefaultLocation}
                    // isBulkUpdateDefaultLocationPending={updateDefaultAppMutation.isPending}
                    isBulkUpdateDefaultLocationPending={false}
                  />
                );
              }}
            />
          </div>
          <DisconnectIntegrationModal
            handleModelClose={handleModelClose}
            isOpen={modal.isOpen}
            credentialId={modal.credentialId}
            app={modal.app}
            handleRemoveApp={handleRemoveApp}
          />
        </>
      </SettingsHeader>
    </AtomsWrapper>
  );
};
