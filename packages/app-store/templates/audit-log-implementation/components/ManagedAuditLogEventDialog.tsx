import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui";

interface ManagedEventDialogProps {
  actionKey: {
    action: string;
    checked: boolean;
  };
  onOpenChange: () => void;
  isPending: boolean;
  isOpen: boolean;
  onConfirm: (e: { preventDefault: () => void }) => void;
}

export default function ManagedAuditLogEventDialog(props: ManagedEventDialogProps) {
  const { t } = useLocale("audit-logs");
  const { actionKey, onOpenChange, isPending, onConfirm, isOpen } = props;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <ConfirmationDialogContent
        isPending={isPending}
        variety="warning"
        title={t("managed_auditLog_event_dialog_title", {
          actionKey,
        })}
        confirmBtnText={t("managed_auditLog_event_dialog_confirm_button")}
        cancelBtnText={t("go_back")}
        onConfirm={onConfirm}>
        <p className="mt-5">
          {t(`events.${props.actionKey.action}.managed_auditLog_event_dialog_clarification`)}
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
