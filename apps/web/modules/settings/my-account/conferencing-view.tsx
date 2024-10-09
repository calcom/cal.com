"use client";

import { useReducer } from "react";

import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen, SkeletonContainer, SkeletonText } from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";

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

const ConferencingView = () => {
  const { t } = useLocale();

  const [modal, updateModal] = useReducer(
    (data: ModalState, partialData: Partial<ModalState>) => ({ ...data, ...partialData }),
    {
      isOpen: false,
      credentialId: null,
    }
  );

  const query = trpc.viewer.integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: true,
  });

  const handleModelClose = () => {
    updateModal({ isOpen: false, credentialId: null });
  };

  const handleDisconnect = (credentialId: number) => {
    updateModal({ isOpen: true, credentialId });
  };

  return (
    <>
      <div className="bg-default w-full sm:mx-0 xl:mt-0">
        <QueryCell
          query={query}
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
              />
            );
          }}
        />
      </div>
      <DisconnectIntegrationModal
        handleModelClose={handleModelClose}
        isOpen={modal.isOpen}
        credentialId={modal.credentialId}
      />
    </>
  );
};

export default ConferencingView;
