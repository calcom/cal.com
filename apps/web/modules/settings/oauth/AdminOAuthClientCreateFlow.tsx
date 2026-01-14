"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { OAuthClientPreviewDialog } from "./OAuthClientPreviewDialog";
import { OAuthClientCreateDialog } from "./OAuthClientCreateModal";
import type { OAuthClientCreateFlowProps } from "./OAuthClientCreateFlow";

export function AdminOAuthClientCreateFlow(
  {
    createdClient,
    ...rest
  }: OAuthClientCreateFlowProps
) {
  const { t } = useLocale();

  if (createdClient) {
    return (
      <OAuthClientPreviewDialog
        open={rest.open}
        onOpenChange={rest.onOpenChange}
        title={t("oauth_client_created")}
        description={t("oauth_client_created_description")}
        client={createdClient}
        onClose={rest.onClose}
      />
    );
  }

  return (
    <OAuthClientCreateDialog
      {...rest}
    />
  );
}
