"use client";

import { useLocale } from "@calcom/i18n/useLocale";

import { Alert, AlertDescription } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { CopyableField } from "@coss/ui/shared/copyable-field";
import { TriangleAlertIcon } from "@coss/ui/icons";

import type { OAuthClientDetails } from "../view/OAuthClientDetailsDialog";

export function OAuthClientPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  client,
  onClose,
  onCloseComplete,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  client: OAuthClientDetails | null;
  onClose: () => void;
  onCloseComplete?: () => void;
}) {
  const { t } = useLocale();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
    onOpenChange?.(nextOpen);
  };

  const handleOpenChangeComplete = (nextOpen: boolean) => {
    if (!nextOpen) {
      onCloseComplete?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} onOpenChangeComplete={handleOpenChangeComplete}>
      <DialogPopup className="max-w-xl">
        {client ? (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogPanel className="grid gap-6" data-testid="oauth-client-submitted-modal">
              {client.status === "PENDING" ? (
                <Badge className="w-fit" variant="warning">
                  {t("pending")}
                </Badge>
              ) : null}

              <Field>
                <FieldLabel>{t("client_name")}</FieldLabel>
                <Input disabled value={client.name} />
              </Field>

              <CopyableField
                copyTooltip={t("copy_to_clipboard")}
                copiedTooltip={t("client_id_copied")}
                data-testid="oauth-client-submitted-client-id"
                label={t("client_id")}
                value={client.clientId}
                monospace
              />

              {client.clientSecret ? (
                <>
                  <CopyableField
                    copyTooltip={t("copy_to_clipboard")}
                    copiedTooltip={t("client_secret_copied")}
                    data-testid="oauth-client-submitted-client-secret"
                    label={t("client_secret")}
                    value={client.clientSecret}
                    monospace
                  />
                  <Alert variant="warning">
                    <TriangleAlertIcon />
                    <AlertDescription>
                      {t("oauth_client_client_secret_one_time_warning")}
                    </AlertDescription>
                  </Alert>
                </>
              ) : null}
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button data-testid="oauth-client-submitted-done" />}>{t("done")}</DialogClose>
            </DialogFooter>
          </>
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}
