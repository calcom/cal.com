import { Trans } from "next-i18next";
import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc, TRPCClientError } from "@calcom/trpc/react";
import type { DialogProps } from "@calcom/ui";
import { ConfirmationDialogContent, Dialog, showToast } from "@calcom/ui";

export function DeleteDialog({
  isManagedEvent,
  eventTypeId,
  open,
  onOpenChange,
  onDelete,
}: {
  isManagedEvent: string;
  eventTypeId: number;
  onDelete: () => void;
} & Pick<DialogProps, "open" | "onOpenChange">) {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const router = useRouter();
  const deleteMutation = trpc.viewer.eventTypes.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.eventTypes.invalidate();
      showToast(t("event_type_deleted_successfully"), "success");
      onDelete();
      router.push("/event-types");
      onOpenChange?.(false);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        onOpenChange?.(false);
      } else if (err instanceof TRPCClientError) {
        showToast(err.message, "error");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ConfirmationDialogContent
        isPending={deleteMutation.isPending}
        variety="danger"
        title={t(`delete${isManagedEvent}_event_type`)}
        confirmBtnText={t(`confirm_delete_event_type`)}
        loadingText={t(`confirm_delete_event_type`)}
        onConfirm={(e) => {
          e.preventDefault();
          deleteMutation.mutate({ id: eventTypeId });
        }}>
        <p className="mt-5">
          <Trans
            i18nKey={`delete${isManagedEvent}_event_type_description`}
            components={{ li: <li />, ul: <ul className="ml-4 list-disc" /> }}>
            <ul>
              <li>Members assigned to this event type will also have their event types deleted.</li>
              <li>Anyone who they&apos;ve shared their link with will no longer be able to book using it.</li>
            </ul>
          </Trans>
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
