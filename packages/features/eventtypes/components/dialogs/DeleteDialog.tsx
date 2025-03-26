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
          {isManagedEvent ? (
            <ul className="ml-4 list-disc">
              <li>{t("delete_managed_event_type_description_1")}</li>
              <li>{t("delete_managed_event_type_description_2")}</li>
            </ul>
          ) : (
            t("delete_event_type_description")
          )}
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
