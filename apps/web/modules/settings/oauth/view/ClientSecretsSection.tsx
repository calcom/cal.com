"use client";

import { useState } from "react";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
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
import { Label } from "@coss/ui/components/label";
import { toastManager } from "@coss/ui/components/toast";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { ClipboardIcon, PlusIcon, TrashIcon, TriangleAlertIcon } from "@coss/ui/icons";

export function ClientSecretsSection({ clientId }: { clientId: string }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [deleteSecretId, setDeleteSecretId] = useState<number | null>(null);

  const { data: secrets, isLoading } = trpc.viewer.oAuth.getClientSecrets.useQuery({ clientId });

  const createSecretMutation = trpc.viewer.oAuth.createClientSecret.useMutation({
    onSuccess: (data) => {
      setNewlyCreatedSecret(data.clientSecret);
      utils.viewer.oAuth.getClientSecrets.invalidate({ clientId });
    },
    onError: (error) => {
      toastManager.add({ title: error.message || t("error"), type: "error" });
    },
  });

  const deleteSecretMutation = trpc.viewer.oAuth.deleteClientSecret.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("oauth_client_secret_deleted"), type: "success" });
      setDeleteSecretId(null);
      utils.viewer.oAuth.getClientSecrets.invalidate({ clientId });
    },
    onError: (error) => {
      toastManager.add({ title: error.message || t("error"), type: "error" });
    },
  });

  const canGenerateNew = (secrets?.length ?? 0) < 2;
  const canDelete = (secrets?.length ?? 0) > 1;

  return (
    <div data-testid="oauth-client-secrets-section">
      <Label className="mb-2">{t("client_secrets")}</Label>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-muted-foreground py-2 text-sm">{t("loading")}</div>
        ) : secrets && secrets.length > 0 ? (
          secrets.map((secret) => (
            <div key={secret.id} data-testid={`oauth-client-secret-row-${secret.id}`} className="flex items-center gap-2">
              <div className="border bg-muted/50 flex h-9 flex-1 items-center rounded-md px-3">
                <SecretHint hint={secret.secretHint} />
                <CreationDate date={secret.createdAt} />
              </div>
              {canDelete ? <DeleteSecretButton secretId={secret.id} onDelete={setDeleteSecretId} /> : null}
            </div>
          ))
        ) : null}
        {canGenerateNew ? (
          <GenerateSecretButton
            isPending={createSecretMutation.isPending}
            onClick={() => createSecretMutation.mutate({ clientId })}
          />
        ) : (
          <p className="text-muted-foreground text-xs" data-testid="oauth-client-max-secrets-reached">
            {t("oauth_client_max_secrets_reached")}
          </p>
        )}
      </div>

      <NewSecretDialog secret={newlyCreatedSecret} onClose={() => setNewlyCreatedSecret(null)} />

      <DeleteSecretConfirmDialog
        open={deleteSecretId !== null}
        isPending={deleteSecretMutation.isPending}
        onClose={() => setDeleteSecretId(null)}
        onConfirm={() => {
          if (deleteSecretId === null) return;
          deleteSecretMutation.mutate({ clientId, secretId: deleteSecretId });
        }}
      />
    </div>
  );
}

function SecretHint({ hint }: { hint: string }) {
  return <span className="text-foreground font-mono text-sm">...{hint}</span>;
}

function CreationDate({ date }: { date: Date | string }) {
  const {
    i18n: { language },
  } = useLocale();
  return (
    <span className="text-muted-foreground ml-2 text-xs">
      {new Intl.DateTimeFormat(language, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(date))}
    </span>
  );
}

function DeleteSecretButton({ secretId, onDelete }: { secretId: number; onDelete: (id: number) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-testid={`oauth-client-secret-delete-${secretId}`}
      onClick={() => onDelete(secretId)}>
      <TrashIcon className="size-4" />
    </Button>
  );
}

function GenerateSecretButton({ isPending, onClick }: { isPending: boolean; onClick: () => void }) {
  const { t } = useLocale();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={isPending}
      data-testid="oauth-client-generate-secret"
      onClick={onClick}>
      <PlusIcon className="size-4" />
      {t("generate_new_secret")}
    </Button>
  );
}

function NewSecretDialog({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();

  return (
    <Dialog open={secret !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t("new_client_secret")}</DialogTitle>
          <DialogDescription>{t("client_secret")}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="space-y-4">
          <div>
            <div className="text-muted-foreground mb-1 text-sm">{t("client_secret")}</div>
            <div className="flex">
              <code
                data-testid="oauth-client-new-secret-value"
                className="bg-muted text-foreground w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                {secret}
              </code>
              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        onClick={() => {
                          copyToClipboard(secret ?? "", {
                            onSuccess: () => toastManager.add({ title: t("client_secret_copied"), type: "success" }),
                            onFailure: () => toastManager.add({ title: t("error"), type: "error" }),
                          });
                        }}
                        type="button"
                        size="sm"
                        className="rounded-l-none"
                      />
                    }>
                    <ClipboardIcon className="size-4" />
                    {t("copy")}
                  </TooltipTrigger>
                  <TooltipPopup>{t("copy_to_clipboard")}</TooltipPopup>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertDescription>{t("oauth_client_client_secret_one_time_warning")}</AlertDescription>
          </Alert>
        </DialogPanel>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" />}
            data-testid="oauth-client-new-secret-done">
            {t("done")}
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function DeleteSecretConfirmDialog({
  open,
  isPending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLocale();

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete_client_secret")}</AlertDialogTitle>
          <AlertDialogDescription>{t("confirm_delete_client_secret")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>{t("cancel")}</AlertDialogClose>
          <Button
            type="button"
            variant="destructive"
            data-testid="oauth-client-secret-delete-confirm"
            loading={isPending}
            onClick={onConfirm}>
            {t("delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
