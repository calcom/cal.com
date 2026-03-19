"use client";

import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { Label } from "@calcom/ui/components/form";

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
      showToast(error.message || t("error"), "error");
    },
  });

  const deleteSecretMutation = trpc.viewer.oAuth.deleteClientSecret.useMutation({
    onSuccess: () => {
      showToast(t("oauth_client_secret_deleted"), "success");
      setDeleteSecretId(null);
      utils.viewer.oAuth.getClientSecrets.invalidate({ clientId });
    },
    onError: (error) => {
      showToast(error.message || t("error"), "error");
    },
  });

  const canGenerateNew = (secrets?.length ?? 0) < 2;
  const canDelete = (secrets?.length ?? 0) > 1;

  return (
    <div data-testid="oauth-client-secrets-section">
      <Label className="text-emphasis mb-2 block text-sm font-medium">{t("client_secrets")}</Label>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-subtle py-2 text-sm">{t("loading")}</div>
        ) : secrets && secrets.length > 0 ? (
          secrets.map((secret) => (
            <div key={secret.id} data-testid={`oauth-client-secret-row-${secret.id}`} className="flex items-center gap-2">
              <div className="border-default bg-default flex h-9 flex-1 items-center rounded-md border px-3">
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
          <p className="text-subtle text-xs" data-testid="oauth-client-max-secrets-reached">
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
  return <span className="text-default font-mono text-sm">...{hint}</span>;
}

function CreationDate({ date }: { date: Date | string }) {
  const {
    i18n: { language },
  } = useLocale();
  return (
    <span className="text-subtle ml-2 text-xs">
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
      variant="icon"
      color="destructive"
      StartIcon="trash"
      data-testid={`oauth-client-secret-delete-${secretId}`}
      onClick={() => onDelete(secretId)}
    />
  );
}

function GenerateSecretButton({ isPending, onClick }: { isPending: boolean; onClick: () => void }) {
  const { t } = useLocale();

  return (
    <Button
      type="button"
      color="minimal"
      StartIcon="plus"
      loading={isPending}
      data-testid="oauth-client-generate-secret"
      onClick={onClick}>
      {t("generate_new_secret")}
    </Button>
  );
}

function NewSecretDialog({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();

  return (
    <Dialog open={secret !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent type="creation" title={t("new_client_secret")}>
        <div className="space-y-4">
          <div>
            <div className="text-subtle mb-1 text-sm">{t("client_secret")}</div>
            <div className="flex">
              <code
                data-testid="oauth-client-new-secret-value"
                className="bg-subtle text-default w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                {secret}
              </code>
              <Tooltip side="top" content={t("copy_to_clipboard")}>
                <Button
                  onClick={() => {
                    copyToClipboard(secret ?? "", {
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
          </div>
          <Alert severity="warning" message={t("oauth_client_client_secret_one_time_warning")} />
        </div>
        <DialogFooter className="mt-6">
          <Button type="button" onClick={onClose} data-testid="oauth-client-new-secret-done">
            {t("done")}
          </Button>
        </DialogFooter>
      </DialogContent>
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
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <ConfirmationDialogContent
        variety="danger"
        title={t("delete_client_secret")}
        cancelBtnText={t("cancel")}
        isPending={isPending}
        confirmBtn={
          <Button
            type="button"
            color="destructive"
            data-testid="oauth-client-secret-delete-confirm"
            loading={isPending}
            onClick={onConfirm}>
            {t("delete")}
          </Button>
        }>
        <p>{t("confirm_delete_client_secret")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
