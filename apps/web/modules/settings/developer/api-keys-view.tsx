"use client";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Dialog, DialogPopup } from "@coss/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { LinkIcon, PlusIcon } from "@coss/ui/icons";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";
import { useEffect, useRef, useState } from "react";
import ApiKeyDialogForm from "~/ee/api-keys/components/ApiKeyDialogForm";
import type { TApiKeys } from "~/ee/api-keys/components/ApiKeyListItem";
import ApiKeyListItem from "~/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "~/ee/common/components/LicenseRequired";

export const apiKeyModalRef = {
  current: null as null | ((show: boolean) => void),
};
export const apiKeyToEditRef = {
  current: null as null | ((apiKey: (TApiKeys & { neverExpires?: boolean }) | undefined) => void),
};

export const NewApiKeyButton = ({ isEmptyState }: { isEmptyState?: boolean }) => {
  const { t } = useLocale();
  return (
    <Button
      variant={isEmptyState ? "default" : "outline"}
      onClick={() => {
        apiKeyModalRef.current?.(true);
        apiKeyToEditRef.current?.(undefined);
      }}>
      <PlusIcon aria-hidden />
      {t("new")}
    </Button>
  );
};

type Props = {
  apiKeys: RouterOutputs["viewer"]["apiKeys"]["list"];
};

const ApiKeysView = ({ apiKeys: data }: Props) => {
  const { t } = useLocale();

  const [apiKeyModal, setApiKeyModal] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement>(null);
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
    <>
      <AppHeader>
        <AppHeaderContent title={t("api_keys")}>
          <AppHeaderDescription>
            {t("create_first_api_key_description", { appName: APP_NAME })}
          </AppHeaderDescription>
        </AppHeaderContent>
        {data?.length ? (
          <AppHeaderActions>
            <NewApiKeyButton />
          </AppHeaderActions>
        ) : null}
      </AppHeader>

      <LicenseRequired>
        {data?.length ? (
          <Card>
            <CardPanel className="p-0">
              {data.map((apiKey) => (
                <ApiKeyListItem
                  key={apiKey.id}
                  apiKey={apiKey}
                  onEditClick={() => {
                    setApiKeyToEdit(apiKey);
                    setApiKeyModal(true);
                  }}
                />
              ))}
            </CardPanel>
          </Card>
        ) : (
          <Empty className="rounded-xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LinkIcon />
              </EmptyMedia>
              <EmptyTitle>{t("create_first_api_key")}</EmptyTitle>
              <EmptyDescription>
                {t("create_first_api_key_description", { appName: APP_NAME })}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <NewApiKeyButton isEmptyState />
            </EmptyContent>
          </Empty>
        )}
      </LicenseRequired>

      <Dialog open={apiKeyModal} onOpenChange={setApiKeyModal}>
        <DialogPopup className="max-w-xl" initialFocus={initialFocusRef}>
          <ApiKeyDialogForm
            handleClose={() => setApiKeyModal(false)}
            defaultValues={apiKeyToEdit}
            initialFocusRef={initialFocusRef}
          />
        </DialogPopup>
      </Dialog>
    </>
  );
};

export default ApiKeysView;
