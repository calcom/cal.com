"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { OAuthClientPreviewDialog } from "./OAuthClientPreviewDialog";
import type { OAuthClientDetails } from "./OAuthClientDetailsDialog";
import { OAuthClientCreateDialog, type OAuthClientCreateDialogProps } from "./OAuthClientCreateModal";

export type OAuthClientCreateFlowProps = OAuthClientCreateDialogProps & {
  createdClient: OAuthClientDetails | null;
};

export function OAuthClientCreateFlow({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
  createdClient,
  onClose,
}: OAuthClientCreateFlowProps) {
  const { t } = useLocale();

  if (createdClient) {
    return (
      <OAuthClientPreviewDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t("oauth_client_submitted")}
        description={t("oauth_client_submitted_description")}
        client={createdClient}
        onClose={onClose}
      />
    );
  }

  return (
    <OAuthClientCreateDialog
      open={open}
      onOpenChange={onOpenChange}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}
