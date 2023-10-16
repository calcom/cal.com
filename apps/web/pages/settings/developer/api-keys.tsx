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
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";
import { Link as LinkIcon, Plus } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={true} />
      <div className="divide-subtle border-subtle space-y-6 rounded-b-lg border border-t-0 px-6 py-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

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

  if (isLoading || !data) {
    return (
      <SkeletonLoader
        title={t("api_keys")}
        description={t("create_first_api_key_description", { appName: APP_NAME })}
      />
    );
  }

  return (
    <>
      <Meta
        title={t("api_keys")}
        description={t("create_first_api_key_description", { appName: APP_NAME })}
        CTA={<NewApiKeyButton />}
        borderInShellHeader={true}
      />

      <LicenseRequired>
        <div>
          {data?.length ? (
            <>
              <div className="border-subtle rounded-b-lg border border-t-0">
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
              className="rounded-b-lg rounded-t-none border-t-0"
              buttonRaw={<NewApiKeyButton />}
            />
          )}
        </div>
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
