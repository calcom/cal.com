"use client";

import type { SSOConnection } from "@calcom/ee/sso/lib/saml";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Label } from "@coss/ui/components/label";
import { toastManager } from "@coss/ui/components/toast";
import { CopyableField } from "@coss/ui/shared/copyable-field";
import { useState } from "react";

export default function ConnectionInfo({
  teamId,
  connection,
}: {
  teamId: number | null;
  connection: SSOConnection;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const connectionType = connection.type.toUpperCase();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const mutation = trpc.viewer.saml.delete.useMutation({
    async onSuccess() {
      toastManager.add({
        title: t("sso_connection_deleted_successfully", { connectionType }),
        type: "success",
      });
      setDeleteDialogOpen(false);
      await utils.viewer.saml.get.invalidate();
    },
  });

  const deleteConnection = async () => {
    mutation.mutate({
      teamId,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {connection.type === "saml" ? (
        <SAMLInfo acsUrl={connection.acsUrl} entityId={connection.entityId} />
      ) : (
        <OIDCInfo callbackUrl={connection.callbackUrl} />
      )}
      <div className="flex flex-col gap-2">
        <Label render={<div />}>{t("danger_zone")}</Label>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger
            render={
              <Button
                variant="destructive-outline"
                className="w-fit"
                data-testid={`delete-${connectionType === "OIDC" ? "oidc" : "saml"}-sso-connection`}>
                {t("delete_sso_configuration", { connectionType })}
              </Button>
            }
          />
          <DialogPopup showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{t("delete_sso_configuration", { connectionType })}</DialogTitle>
              <DialogDescription>
                {t("delete_sso_configuration_confirmation_description", {
                  appName: APP_NAME,
                  connectionType,
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
              <DialogClose
                render={<Button variant="destructive" />}
                onClick={deleteConnection}
                data-testid="dialog-confirmation">
                {t("delete_sso_configuration_confirmation", { connectionType })}
              </DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      </div>
    </div>
  );
}

// Connection info for SAML
const SAMLInfo = ({ acsUrl, entityId }: { acsUrl: string | null; entityId: string | null }) => {
  const { t } = useLocale();

  if (!acsUrl || !entityId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <CopyableField
        label="ACS URL"
        value={acsUrl}
        monospace
        copyTooltip={t("copy_to_clipboard")}
        copiedTooltip={t("sso_saml_acsurl_copied")}
      />
      <CopyableField
        label="Entity ID"
        value={entityId}
        monospace
        copyTooltip={t("copy_to_clipboard")}
        copiedTooltip={t("sso_saml_entityid_copied")}
      />
    </div>
  );
};

// Connection info for OIDC
const OIDCInfo = ({ callbackUrl }: { callbackUrl: string | null }) => {
  const { t } = useLocale();

  if (!callbackUrl) {
    return null;
  }

  return (
    <CopyableField
      label="Callback URL"
      value={callbackUrl}
      monospace
      copyTooltip={t("copy_to_clipboard")}
      copiedTooltip={t("sso_oidc_callback_copied")}
    />
  );
};
