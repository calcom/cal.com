"use client";

import { useEffect, useState } from "react";

import type { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import ApiKeyDialogForm from "@calcom/features/ee/api-keys/components/ApiKeyDialogForm";
import ApiKeyListItem from "@calcom/features/ee/api-keys/components/ApiKeyListItem";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export const apiKeyModalRef = {
  current: null as null | ((show: boolean) => void),
};
export const apiKeyToEditRef = {
  current: null as null | ((apiKey: (TApiKeys & { neverExpires?: boolean }) | undefined) => void),
};

export const NewApiKeyButton = () => {
  const { t } = useLocale();
  return (
    <Button
      color="secondary"
      StartIcon="plus"
      onClick={() => {
        apiKeyModalRef.current?.(true);
        apiKeyToEditRef.current?.(undefined);
      }}>
      {t("add")}
    </Button>
  );
};

type Props = {
  apiKeys: RouterOutputs["viewer"]["apiKeys"]["list"];
};

const ApiKeysView = ({ apiKeys: data }: Props) => {
  const { t } = useLocale();

  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKeyToEdit, setApiKeyToEdit] = useState<(TApiKeys & { neverExpires?: boolean }) | undefined>(
    undefined
  );

  useEffect(() => {
    apiKeyModalRef.current = setApiKeyModal;
    apiKeyToEditRef.current = setApiKeyToEdit;
    return () => {
      apiKeyModalRef.current = null;
      apiKeyToEditRef.current = null;
    };
  }, []);

  return (
    <SettingsHeader
      title={t("api_keys")}
      description={t("create_first_api_key_description", { appName: APP_NAME })}
      CTA={<NewApiKeyButton />}
      borderInShellHeader={true}>
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
              Icon="link"
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
    </SettingsHeader>
  );
};

export default ApiKeysView;
