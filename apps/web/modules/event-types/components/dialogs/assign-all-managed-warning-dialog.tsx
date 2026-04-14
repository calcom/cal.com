import { useLocale } from "@calcom/i18n/useLocale";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";

interface AssignAllManagedWarningDialogProps {
  isOpen: boolean;
  eventTypeSlug: string;
  onConfirm: () => void;
  onClose: () => void;
}

const AssignAllManagedWarningDialog = ({
  isOpen,
  eventTypeSlug,
  onConfirm,
  onClose,
}: AssignAllManagedWarningDialogProps) => {
  const { t } = useLocale();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ConfirmationDialogContent
        variety="warning"
        title={t("assign_all_managed_warning_title")}
        confirmBtnText={t("confirm")}
        cancelBtnText={t("go_back")}
        onConfirm={onConfirm}>
        <p className="mt-5">{t("assign_all_managed_warning_description", { slug: eventTypeSlug })}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
};

export default AssignAllManagedWarningDialog;
