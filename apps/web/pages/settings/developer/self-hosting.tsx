// TODO: this page is a duplicate of API keys and should, of course,
// use the correct License Key generation setup page, not the API key setup page
import { useState } from "react";

import type { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import ApiKeyDialogForm from "@calcom/features/ee/api-keys/components/ApiKeyDialogForm";
import ApiKeyListItem from "@calcom/features/ee/api-keys/components/ApiKeyListItem";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogContent,
  EmptyScreen,
  Meta,
  AppSkeletonLoader as SkeletonLoader,
} from "@calcom/ui";
import { Server as ServerIcon } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

const SelfHostingView = () => {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.apiKeys.list.useQuery();

  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKeyToEdit, setApiKeyToEdit] = useState<(TApiKeys & { neverExpires?: boolean }) | undefined>(
    undefined
  );

  const ContinueButton = () => {
    return (
      <Button
        color="primary"
        onClick={() => {
          setApiKeyToEdit(undefined);
          setApiKeyModal(true);
        }}>
        {t("continue")}
      </Button>
    );
  };

  return (
    <>
      <Meta title={t("self_hosting")} description={t("self_hosting_description")} />

      <LicenseRequired>
        <>
          {isLoading && <SkeletonLoader />}
          <div>
            {isLoading ? null : data?.length ? (
              <>
                <div className="border-subtle mb-8 mt-6 rounded-md border">
                  {data.map((apiKey, index) => (
                    <ApiKeyListItem
                      key={apiKey.id}
                      apiKey={apiKey}
                      lastItem={data.length === index + 1}
                      onEditClick={() => {
                        setApiKeyToEdit(apiKey);
                        setApiKeyModal(true);
                      }}
                    />
                  ))}
                </div>
                <ContinueButton />
              </>
            ) : (
              <EmptyScreen
                Icon={ServerIcon}
                headline={t("host_calcom_title")}
                description={t("host_calcom_description")}
                buttonRaw={
                  <div className="flex space-x-2">
                    <ContinueButton />
                    <Button href="https://cal.com/sales" color="secondary">
                      {t("contact_sales")}
                    </Button>
                  </div>
                }
              />
            )}
          </div>
        </>
      </LicenseRequired>

      <Dialog open={apiKeyModal} onOpenChange={setApiKeyModal}>
        <DialogContent type="creation">
          <ApiKeyDialogForm handleClose={() => setApiKeyModal(false)} defaultValues={apiKeyToEdit} />
        </DialogContent>
      </Dialog>
    </>
  );
};

SelfHostingView.getLayout = getLayout;
SelfHostingView.PageWrapper = PageWrapper;

export default SelfHostingView;
