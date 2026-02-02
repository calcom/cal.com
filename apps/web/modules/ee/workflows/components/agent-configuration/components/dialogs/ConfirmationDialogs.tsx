"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Dialog as UIDialog } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

interface ConfirmationDialogsProps {
  cancellingNumberId: number | null;
  setCancellingNumberId: (id: number | null) => void;
  numberToDelete: string | null;
  setNumberToDelete: (number: string | null) => void;
  agentId?: string | null;
}

export function ConfirmationDialogs({
  cancellingNumberId,
  setCancellingNumberId,
  numberToDelete,
  setNumberToDelete,
  agentId,
}: ConfirmationDialogsProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const cancelSubscriptionMutation = trpc.viewer.phoneNumber.cancel.useMutation({
    onSuccess: async (data: { message?: string }) => {
      showToast(data.message || t("phone_number_subscription_cancelled_successfully"), "success");
      setCancellingNumberId(null);

      await utils.viewer.me.get.invalidate();
      if (agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
      setCancellingNumberId(null);
    },
  });

  const deletePhoneNumberMutation = trpc.viewer.phoneNumber.delete.useMutation({
    onSuccess: async () => {
      showToast(t("phone_number_deleted_successfully"), "success");
      setNumberToDelete(null);

      if (agentId) {
        await utils.viewer.aiVoiceAgent.get.invalidate({ id: agentId });
      }
    },
    onError: (error: { message: string }) => {
      showToast(error.message, "error");
      setNumberToDelete(null);
    },
  });

  const confirmCancelSubscription = () => {
    if (cancellingNumberId) {
      cancelSubscriptionMutation.mutate({ phoneNumberId: cancellingNumberId });
    }
  };

  const confirmDeletePhoneNumber = () => {
    if (numberToDelete) {
      deletePhoneNumberMutation.mutate({ phoneNumber: numberToDelete });
    }
  };

  return (
    <>
      <UIDialog open={cancellingNumberId !== null} onOpenChange={() => setCancellingNumberId(null)}>
        <ConfirmationDialogContent
          isPending={cancelSubscriptionMutation.isPending}
          variety="danger"
          title={t("cancel_phone_number_subscription")}
          confirmBtnText={t("yes_cancel_subscription")}
          onConfirm={confirmCancelSubscription}>
          {t("cancel_phone_number_subscription_confirmation")}
        </ConfirmationDialogContent>
      </UIDialog>

      <UIDialog open={numberToDelete !== null} onOpenChange={() => setNumberToDelete(null)}>
        <ConfirmationDialogContent
          isPending={deletePhoneNumberMutation.isPending}
          variety="danger"
          title={t("delete_phone_number")}
          confirmBtnText={t("yes_delete_phone_number")}
          onConfirm={confirmDeletePhoneNumber}>
          {t("delete_phone_number_confirmation")}
        </ConfirmationDialogContent>
      </UIDialog>
    </>
  );
}
