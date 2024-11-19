"use client";

import { useReducer } from "react";

import type {
  HandleBulkUpdateDefaultLocationParams,
  HandleRemoveAppParams,
  HandleUpdateDefaultConferencingAppParams,
} from "@calcom/atoms/connect/conferencing-apps/ConferencingAppsViewWebWrapper";
import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { type RouterOutputs } from "@calcom/trpc";
import { Button, EmptyScreen, SkeletonContainer, SkeletonText } from "@calcom/ui";

import { AppList } from "@components/apps/AppList";

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
type ConferencingViewProps = {
  installedIntegrationsQueryData?: RouterOutputs["viewer"]["integrations"];
  isInstalledIntegrationsQueryPending: boolean;
  handleRemoveApp: (params: HandleRemoveAppParams) => void;
  defaultConferencingApp?: RouterOutputs["viewer"]["updateUserDefaultConferencingApp"];
  handleUpdateDefaultConferencingApp: (params: HandleUpdateDefaultConferencingAppParams) => void;
  handleBulkUpdateDefaultLocation: (params: HandleBulkUpdateDefaultLocationParams) => void;
  isBulkUpdateDefaultLocationPending: boolean;
};
const ConferencingView = ({
  installedIntegrationsQueryData,
  isInstalledIntegrationsQueryPending,
  handleRemoveApp,
  defaultConferencingApp,
  handleUpdateDefaultConferencingApp,
  handleBulkUpdateDefaultLocation,
  isBulkUpdateDefaultLocationPending,
}: ConferencingViewProps) => {
  const { t } = useLocale();

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

  return (
    <>
      <div className="bg-default w-full sm:mx-0 xl:mt-0">
        {isInstalledIntegrationsQueryPending ? (
          <SkeletonLoader />
        ) : installedIntegrationsQueryData?.items?.length ? (
          <AppList
            listClassName="rounded-lg rounded-t-none border-t-0 max-w-full"
            handleDisconnect={handleDisconnect}
            data={installedIntegrationsQueryData}
            variant="conferencing"
            defaultConferencingApp={defaultConferencingApp}
            handleUpdateDefaultConferencingApp={handleUpdateDefaultConferencingApp}
            handleBulkUpdateDefaultLocation={handleBulkUpdateDefaultLocation}
            isBulkUpdateDefaultLocationPending={isBulkUpdateDefaultLocationPending}
          />
        ) : (
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
        )}
      </div>
      <DisconnectIntegrationModal
        handleModelClose={handleModelClose}
        isOpen={modal.isOpen}
        credentialId={modal.credentialId}
        handleRemoveApp={handleRemoveApp}
      />
    </>
  );
};

export default ConferencingView;
