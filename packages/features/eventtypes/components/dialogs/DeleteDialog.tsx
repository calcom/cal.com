import { Trans } from "next-i18next";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { DialogProps } from "@calcom/ui/components/dialog";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";

export function DeleteDialog({
  isManagedEvent,
  eventTypeId,
  open,
  onOpenChange,
  onDelete,
  isDeleting,
}: {
  isManagedEvent: string;
  eventTypeId: number;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
} & Pick<DialogProps, "open" | "onOpenChange">) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ConfirmationDialogContent
        isPending={isDeleting}
        variety="danger"
        title={t(`delete${isManagedEvent}_event_type`)}
        confirmBtnText={t(`confirm_delete_event_type`)}
        loadingText={t(`confirm_delete_event_type`)}
        onConfirm={(e) => {
          e.preventDefault();
          onDelete(eventTypeId);
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
