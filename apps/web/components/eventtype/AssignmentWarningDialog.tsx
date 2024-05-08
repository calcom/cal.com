import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import type { MutableRefObject } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, ConfirmationDialogContent } from "@calcom/ui";

interface AssignmentWarningDialogProps {
  isOpenAssignmentWarnDialog: boolean;
  setIsOpenAssignmentWarnDialog: Dispatch<SetStateAction<boolean>>;
  pendingRoute: string;
  leaveWithoutAssigningHosts: MutableRefObject<boolean>;
}
const AssignmentWarningDialog = (props: AssignmentWarningDialogProps) => {
  const { t } = useLocale();
  const {
    isOpenAssignmentWarnDialog,
    setIsOpenAssignmentWarnDialog,
    pendingRoute,
    leaveWithoutAssigningHosts,
  } = props;
  const router = useRouter();
  return (
    <Dialog open={isOpenAssignmentWarnDialog} onOpenChange={setIsOpenAssignmentWarnDialog}>
      <ConfirmationDialogContent
        variety="warning"
        title={t("leave_without_assigning_anyone")}
        confirmBtnText={t("leave_without_assigning")}
        cancelBtnText={t("go_back_and_assign")}
        onConfirm={(e) => {
          e.preventDefault();
          setIsOpenAssignmentWarnDialog(false);
          leaveWithoutAssigningHosts.current = true;
          router.replace(pendingRoute);
        }}>
        <div>
          <p className="mt-3">{t("leave_without_adding_attendees")}</p>
          <p className="mt-4">{t("no_availability_shown_to_bookers")}</p>
        </div>
      </ConfirmationDialogContent>
    </Dialog>
  );
};
export default AssignmentWarningDialog;
