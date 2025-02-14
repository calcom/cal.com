"use client";

import { useState } from "react";

import { isDwdCredential } from "@calcom/lib/domainWideDelegation/clientAndServer";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { ButtonProps } from "@calcom/ui";
import { DisconnectIntegrationComponent, showToast } from "@calcom/ui";

export default function DisconnectIntegration(props: {
  credentialId: number;
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  onSuccess?: () => void;
  buttonProps?: ButtonProps;
}) {
  const { t } = useLocale();
  const { onSuccess, credentialId } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.deleteCredential.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      setModalOpen(false);
      onSuccess && onSuccess();
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      setModalOpen(false);
    },
    async onSettled() {
      await utils.viewer.connectedCalendars.invalidate();
      await utils.viewer.integrations.invalidate();
    },
  });

  // Such a credential is added in-memory and removed when Domain-wide delegation is disabled.
  const disableDisconnect = isDwdCredential({ credentialId });
  return (
    <DisconnectIntegrationComponent
      onDeletionConfirmation={() => mutation.mutate({ id: credentialId })}
      isModalOpen={modalOpen}
      onModalOpen={() => setModalOpen((prevValue) => !prevValue)}
      disabled={disableDisconnect}
      {...props}
    />
  );
}
