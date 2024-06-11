import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import type { MutableRefObject } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent, Button, DialogFooter } from "@calcom/ui";

interface AssignmentWarningDialogProps {
  isOpenAssignmentWarnDialog: boolean;
  setIsOpenAssignmentWarnDialog: Dispatch<SetStateAction<boolean>>;
  pendingRoute: string;
  leaveWithoutAssigningHosts: MutableRefObject<boolean>;
  id: number;
}
const AssignmentWarningDialog = (props: AssignmentWarningDialogProps) => {
  const { t } = useLocale();
  const {
    isOpenAssignmentWarnDialog,
    setIsOpenAssignmentWarnDialog,
    pendingRoute,
    leaveWithoutAssigningHosts,
    id,
  } = props;
  const router = useRouter();
  return (
    <Dialog open={isOpenAssignmentWarnDialog} onOpenChange={setIsOpenAssignmentWarnDialog}>
      <DialogContent title={t("leave_without_assigning_anyone")} Icon="circle-alert" type="confirmation">
        <div className="text-subtle text-sm">
          <p className="mt-3">{t("leave_without_adding_attendees")}</p>
          <p className="mt-4">{t("no_availability_shown_to_bookers")}</p>
        </div>
        <DialogFooter className="mt-6">
          <Button
            onClick={(e) => {
              e.preventDefault();
              setIsOpenAssignmentWarnDialog(false);
              router.replace(`/event-types/${id}?tabName=team`);
            }}
            color="minimal">
            {t("go_back_and_assign")}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              setIsOpenAssignmentWarnDialog(false);
              leaveWithoutAssigningHosts.current = true;
              router.replace(pendingRoute);
            }}>
            {t("leave_without_assigning")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default AssignmentWarningDialog;
