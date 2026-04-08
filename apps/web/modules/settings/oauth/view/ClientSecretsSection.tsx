"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import { toastManager } from "@coss/ui/components/toast";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@coss/ui/components/tooltip";
import { PlusIcon, TrashIcon, TriangleAlertIcon } from "@coss/ui/icons";
import { CopyableField } from "@coss/ui/shared/copyable-field";
import { useState } from "react";

const MASKED_SECRET_ELLIPSIS = "\u2026";

export function ClientSecretsSection({ clientId }: { clientId: string }) {
  const {
    t,
    i18n: { language },
  } = useLocale();
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

      <div className="flex flex-col gap-2 items-start">
        {isLoading ? (
          <div className="text-muted-foreground py-2 text-sm">{t("loading")}</div>
        ) : secrets && secrets.length > 0 ? (
          secrets.map((secret) => (
            <InputGroup
              key={secret.id}
              className="min-w-0 w-full"
              data-testid={`oauth-client-secret-row-${secret.id}`}>
              <InputGroupInput
                readOnly
                value={`${MASKED_SECRET_ELLIPSIS}${secret.secretHint}`}
                aria-label={t("client_secret")}
                className="font-mono"
              />
              <InputGroupAddon align="inline-end">
                <Badge variant="secondary">{formatSecretCreatedDate(secret.createdAt, language)}</Badge>
                {canDelete ? (
                  <DeleteSecretButton secretId={secret.id} onDelete={setDeleteSecretId} />
                ) : null}
              </InputGroupAddon>
            </InputGroup>
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

function formatSecretCreatedDate(date: Date | string, language: string) {
  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function DeleteSecretButton({ secretId, onDelete }: { secretId: number; onDelete: (id: number) => void }) {
  const { t } = useLocale();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("delete_client_secret")}
            data-testid={`oauth-client-secret-delete-${secretId}`}
            onClick={() => onDelete(secretId)}
          />
        }>
        <TrashIcon aria-hidden />
      </TooltipTrigger>
      <TooltipPopup>{t("delete_client_secret")}</TooltipPopup>
    </Tooltip>
  );
}

function GenerateSecretButton({ isPending, onClick }: { isPending: boolean; onClick: () => void }) {
  const { t } = useLocale();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-testid="oauth-client-generate-secret"
      loading={isPending}
      onClick={onClick}>
      <PlusIcon aria-hidden />
      {t("generate_new_secret")}
    </Button>
  );
}

function NewSecretDialog({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  const { t } = useLocale();

  return (
    <Dialog open={secret !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t("new_client_secret")}</DialogTitle>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <CopyableField
            copyTooltip={t("copy_to_clipboard")}
            copiedTooltip={t("client_secret_copied")}
            data-testid="oauth-client-new-secret-value"
            label={t("client_secret")}
            monospace
            value={secret ?? ""}
          />
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertDescription>{t("oauth_client_client_secret_one_time_warning")}</AlertDescription>
          </Alert>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button type="button" />} data-testid="oauth-client-new-secret-done">
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
