"use client";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import type { OAuthClientDetails } from "../view/OAuthClientDetailsDialog";

export function OAuthClientPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  client,
  onClose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  client: OAuthClientDetails;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
      return;
    }
    onOpenChange(nextOpen);
  };

  const showPendingBadge = client.status === "PENDING";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent enableOverflow type="creation" title={title} description={description}>
        <>
          <div className="space-y-4" data-testid="oauth-client-submitted-modal">
            {showPendingBadge ? (
              <div className="flex items-center justify-start">
                <Badge variant="orange">{t("pending")}</Badge>
              </div>
            ) : null}

            <div>
              <div className="text-subtle mb-1 text-sm">{t("client_name")}</div>
              <div className="text-emphasis font-medium">{client.name}</div>
            </div>

            <div>
              <div className="text-subtle mb-1 text-sm">{t("client_id")}</div>
              <div className="flex">
                <code
                  data-testid="oauth-client-submitted-client-id"
                  className="bg-subtle text-default w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                  {client.clientId}
                </code>
                <Tooltip side="top" content={t("copy_to_clipboard")}>
                  <Button
                    onClick={() => {
                      copyToClipboard(client.clientId, {
                        onSuccess: () => showToast(t("client_id_copied"), "success"),
                        onFailure: () => showToast(t("error"), "error"),
                      });
                    }}
                    type="button"
                    size="sm"
                    className="rounded-l-none"
                    StartIcon="clipboard">
                    {t("copy")}
                  </Button>
                </Tooltip>
              </div>
            </div>

            {client.clientSecret ? (
              <div>
                <div className="text-subtle mb-1 text-sm">{t("client_secret")}</div>
                <div className="flex">
                  <code
                    data-testid="oauth-client-submitted-client-secret"
                    className="bg-subtle text-default w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                    {client.clientSecret}
                  </code>
                  <Tooltip side="top" content={t("copy_to_clipboard")}>
                    <Button
                      onClick={() => {
                        copyToClipboard(client.clientSecret ?? "", {
                          onSuccess: () => showToast(t("client_secret_copied"), "success"),
                          onFailure: () => showToast(t("error"), "error"),
                        });
                      }}
                      type="button"
                      size="sm"
                      className="rounded-l-none"
                      StartIcon="clipboard">
                      {t("copy")}
                    </Button>
                  </Tooltip>
                </div>
                <Alert
                  severity="warning"
                  message={t("oauth_client_client_secret_one_time_warning")}
                  className="mt-3"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" onClick={onClose} data-testid="oauth-client-submitted-done">
              {t("done")}
            </Button>
          </DialogFooter>
        </>
      </DialogContent>
    </Dialog>
  );
}
