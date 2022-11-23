import { useState } from "react";

import { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/v2/LicenseRequired";
import ApiKeyDialogForm from "@calcom/features/ee/api-keys/components/ApiKeyDialogForm";
import ApiKeyListItem from "@calcom/features/ee/api-keys/components/ApiKeyListItem";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogContent,
  EmptyScreen,
  getSettingsLayout as getLayout,
  Icon,
  Meta,
  SkeletonLoader,
} from "@calcom/ui";

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
        StartIcon={Icon.FiPlus}
        onClick={() => {
          setApiKeyToEdit(undefined);
          setApiKeyModal(true);
        }}>
        {t("new_api_key")}
      </Button>
    );
  };

  return (
    <>
      <Meta title="API Keys" description="API keys allow other apps to communicate with Cal.com" />

      <LicenseRequired>
        <>
          {isLoading && <SkeletonLoader />}
          <div>
            {isLoading ? null : data?.length ? (
              <>
                <div className="mt-6 mb-8 rounded-md border">
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
                <NewApiKeyButton />
              </>
            ) : (
              <EmptyScreen
                Icon={Icon.FiLink}
                headline={t("create_first_api_key")}
                description={t("create_first_api_key_description")}
                buttonRaw={<NewApiKeyButton />}
              />
            )}
          </div>
        </>
      </LicenseRequired>

      <Dialog open={apiKeyModal} onOpenChange={setApiKeyModal}>
        <DialogContent type="creation" useOwnActionButtons>
          <ApiKeyDialogForm handleClose={() => setApiKeyModal(false)} defaultValues={apiKeyToEdit} />
        </DialogContent>
      </Dialog>
    </>
  );
};

ApiKeysView.getLayout = getLayout;

export default ApiKeysView;
