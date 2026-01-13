"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { OAuthClientDetails } from "./OAuthClientDetailsDialog";
import { OAuthClientResultDialog } from "./OAuthClientResultDialog";
import type { OAuthClientCreateFormValues } from "./OAuthClientCreateDialog";
import { OAuthClientCreateDialogContent } from "./OAuthClientCreateDialog";

type AdminOAuthClientCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (values: OAuthClientCreateFormValues) => void;
  resultClient: OAuthClientDetails | null;
  clientSecretInfoKey?: string;
  onClose: () => void;
};

export function AdminOAuthClientCreateDialog(
  {
    resultClient,
    clientSecretInfoKey,
    ...rest
  }: AdminOAuthClientCreateDialogProps
) {
  const { t } = useLocale();

  if (resultClient) {
    return (
      <OAuthClientResultDialog
        open={rest.open}
        onOpenChange={rest.onOpenChange}
        title={t("oauth_client_created")}
        description={t("oauth_client_created_description")}
        resultClient={resultClient}
        clientSecretInfoKey={clientSecretInfoKey}
        onClose={rest.onClose}
      />
    );
  }

  return (
    <OAuthClientCreateDialogContent
      {...rest}
      title={t("create_oauth_client")}
      description={t("create_oauth_client_description")}
      submitLabel={t("create")}
    />
  );
}
