import { Trans } from "next-i18next";

import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui";

interface ManagedEventDialogProps {
  slugExistsChildrenDialogOpen: ChildrenEventType[];
  slug: string;
  onOpenChange: () => void;
  isLoading: boolean;
  onConfirm: (e: { preventDefault: () => void }) => void;
}

export default function ManagedEventDialog(props: ManagedEventDialogProps) {
  const { t } = useLocale();
  const { slugExistsChildrenDialogOpen, slug, onOpenChange, isLoading, onConfirm } = props;

  return (
    <Dialog open={slugExistsChildrenDialogOpen.length > 0} onOpenChange={onOpenChange}>
      <ConfirmationDialogContent
        isLoading={isLoading}
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
          <Trans
            i18nKey="managed_event_dialog_information"
            values={{
              names: `${slugExistsChildrenDialogOpen
                .map((ch) => ch.owner.name)
                .slice(0, -1)
                .join(", ")} ${
                slugExistsChildrenDialogOpen.length > 1 ? t("and") : ""
              } ${slugExistsChildrenDialogOpen.map((ch) => ch.owner.name).slice(-1)}`,
              slug,
            }}
            count={slugExistsChildrenDialogOpen.length}
          />
        </p>{" "}
        <p className="mt-5">{t("managed_event_dialog_clarification")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
