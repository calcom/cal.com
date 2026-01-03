import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";

interface ManagedEventDialogProps {
  slugExistsChildrenDialogOpen: ChildrenEventType[];
  slug: string;
  onOpenChange: () => void;
  isPending: boolean;
  onConfirm: (e: { preventDefault: () => void }) => void;
}

export default function ManagedEventDialog(props: ManagedEventDialogProps) {
  const { t } = useLocale();
  const { slugExistsChildrenDialogOpen, slug, onOpenChange, isPending, onConfirm } = props;

  return (
    <Dialog open={slugExistsChildrenDialogOpen.length > 0} onOpenChange={onOpenChange}>
      <ConfirmationDialogContent
        isPending={isPending}
        variety="warning"
        title={t("managed_event_dialog_title", {
          slug,
          count: slugExistsChildrenDialogOpen.length,
        })}
        confirmBtnText={t("managed_event_dialog_confirm_button", {
          count: slugExistsChildrenDialogOpen.length,
        })}
        cancelBtnText={t("go_back")}
        onConfirm={onConfirm}>
        <p className="mt-5">
          <ServerTrans
            t={t}
            i18nKey={
              slugExistsChildrenDialogOpen.length > 1
                ? "managed_event_dialog_information_other"
                : "managed_event_dialog_information_one"
            }
            values={{
              names: `${slugExistsChildrenDialogOpen
                .map((ch) => ch.owner.name)
                .slice(0, -1)
                .join(", ")} ${
                slugExistsChildrenDialogOpen.length > 1 ? t("and") : ""
              } ${slugExistsChildrenDialogOpen.map((ch) => ch.owner.name).slice(-1)}`,
              slug,
            }}
          />
        </p>{" "}
        <p className="mt-5">{t("managed_event_dialog_clarification")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
