import { useState } from "react";

import { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/v2/LicenseRequired";
import ApiKeyDialogForm from "@calcom/features/ee/api-keys/components/v2/ApiKeyDialogForm";
import ApiKeyListItem from "@calcom/features/ee/api-keys/components/v2/ApiKeyListItem";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";
import { EmptyScreen, Button } from "@calcom/ui/v2";
import { Dialog, DialogContent } from "@calcom/ui/v2/core/Dialog";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const ApiKeysView = () => {
  const { t } = useLocale();

  const { data, isLoading } = trpc.useQuery(["viewer.apiKeys.list"]);

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
      <Meta title="api_keys" description="webhooks_description" />

      <LicenseRequired>
        <>
          {isLoading && <SkeletonLoader />}
          <div>
            {data?.length ? (
              <>
                <div className="mt-6 mb-8 rounded-md border">
                  {data?.map((apiKey, index) => (
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
