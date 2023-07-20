import { useReducer } from "react";

import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen, Meta, SkeletonContainer, SkeletonText } from "@calcom/ui";
import { Calendar, Plus } from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";

import PageWrapper from "@components/PageWrapper";
import { AppList } from "@components/apps/AppList";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="divide-subtle mb-8 mt-6 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const AddConferencingButton = () => {
  const { t } = useLocale();

  return (
    <>
      <Button color="secondary" StartIcon={Plus} href="/apps/categories/conferencing">
        {t("add_conferencing_app")}
      </Button>
    </>
  );
};

type ModalState = {
  isOpen: boolean;
  credentialId: null | number;
};

const ConferencingLayout = () => {
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
        <Meta
          title={t("conferencing")}
          description={t("conferencing_description")}
          CTA={<AddConferencingButton />}
        />
        <QueryCell
          query={query}
          customLoader={
            <SkeletonLoader title={t("conferencing")} description={t("conferencing_description")} />
          }
          success={({ data }) => {
            console.log(data);
            if (!data.items.length) {
              return (
                <EmptyScreen
                  Icon={Calendar}
                  headline={t("no_category_apps", {
                    category: t("conferencing").toLowerCase(),
                  })}
                  description={t("no_category_apps_description_conferencing")}
                  buttonRaw={
                    <Button
                      color="secondary"
                      data-testid="connect-conferencing-apps"
                      href="/apps/categories/conferencing">
                      {t("connect_conferencing_apps")}
                    </Button>
                  }
                />
              );
            }
            return <AppList handleDisconnect={handleDisconnect} data={data} variant="conferencing" />;
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

ConferencingLayout.getLayout = getLayout;
ConferencingLayout.PageWrapper = PageWrapper;

export default ConferencingLayout;
