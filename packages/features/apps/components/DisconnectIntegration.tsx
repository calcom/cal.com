"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { isDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";
import { trpc } from "@calcom/trpc/react";
import { DisconnectIntegrationComponent } from "@calcom/ui/components/disconnect-calendar-integration";
import { showToast } from "@calcom/ui/components/toast";

type DisconnectIntegrationProps = {
  credentialId: number;
  teamId?: number | null;
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  onSuccess?: () => void;
  buttonProps?: any;
};

export default function DisconnectIntegration({
  credentialId,
  label,
  onSuccess,
  buttonProps,
  teamId,
}: DisconnectIntegrationProps) {
  const { t } = useTranslation("apps");
  const [modalOpen, setModalOpen] = useState(false);
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.credentials.delete.useMutation({
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
      await utils.viewer.calendars.connectedCalendars.invalidate();
      await utils.viewer.apps.integrations.invalidate();
    },
  });

  // Such a credential is added in-memory and removed when Delegation credential is disabled.
  const disableDisconnect = isDelegationCredential({ credentialId });
  return (
    <DisconnectIntegrationComponent
      onDeletionConfirmation={() => mutation.mutate({ id: credentialId, ...(teamId ? { teamId } : {}) })}
      isModalOpen={modalOpen}
      onModalOpen={() => setModalOpen((prevValue) => !prevValue)}
      disabled={disableDisconnect}
      {...buttonProps}
    />
  );
}
