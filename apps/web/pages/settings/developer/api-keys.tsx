import { useState } from "react";

import type { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import ApiKeyDialogForm from "@calcom/features/ee/api-keys/components/ApiKeyDialogForm";
import ApiKeyListItem from "@calcom/features/ee/api-keys/components/ApiKeyListItem";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME } from "@calcom/lib/constants";
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
import { Link as LinkIcon, Plus } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

const ApiKeysView = () => {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.apiKeys.list.useQuery();

  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKeyToEdit, setApiKeyToEdit] = useState<(TApiKeys & { neverExpires?: boolean }) | undefined>(
    undefined
  );

  const NewApiKeyButton = () => {
    return (
      <Button
        color="secondary"
        StartIcon={Plus}
        onClick={() => {
          setApiKeyToEdit(undefined);
          setApiKeyModal(true);
        }}>
        {t("add")}
      </Button>
    );
  };

  return (
    <>
      <Meta
        title={t("api_keys")}
        description={t("create_first_api_key_description", { appName: APP_NAME })}
        CTA={<NewApiKeyButton />}
      />

      <LicenseRequired>
        <>
          {isLoading && <SkeletonLoader />}
          <div>
            {isLoading ? null : data?.length ? (
              <>
                <div className="border-subtle rounded-b-md border border-t-0">
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
              </>
            ) : (
              <EmptyScreen
                Icon={LinkIcon}
                headline={t("create_first_api_key")}
                description={t("create_first_api_key_description", { appName: APP_NAME })}
                buttonRaw={<NewApiKeyButton />}
                className="mt-6"
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

ApiKeysView.getLayout = getLayout;
ApiKeysView.PageWrapper = PageWrapper;

export default ApiKeysView;
