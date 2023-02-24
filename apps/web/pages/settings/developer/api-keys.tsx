import type { GetServerSidePropsContext } from "next";
import { useState } from "react";

import type { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/v2/LicenseRequired";
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
import { FiLink, FiPlus } from "@calcom/ui/components/icon";

import { ssrInit } from "@server/lib/ssr";

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
        StartIcon={FiPlus}
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
      <Meta
        title={t("api_keys")}
        description={t("create_first_api_key_description", { appName: APP_NAME })}
      />

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
                Icon={FiLink}
                headline={t("create_first_api_key")}
                description={t("create_first_api_key_description", { appName: APP_NAME })}
                buttonRaw={<NewApiKeyButton />}
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default ApiKeysView;
