import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import type { MutableRefObject } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent, Button, DialogFooter } from "@calcom/ui";

interface AssignmentWarningDialogProps {
  warningDialog: WarningDialogType;
  isOpenWarnDialog: boolean;
  setIsOpenWarnDialog: Dispatch<SetStateAction<boolean>>;
  pendingRoute: string;
  leaveWithoutAction: MutableRefObject<boolean>;
  id: number;
}

export enum WarningDialogType {
  EMPTY_ASSIGNMENTS = "EMPTY_ASSIGNMENTS",
  UNSAVED_CHANGES = "UNSAVED_CHANGES",
}

const AssignmentWarningDialog = (props: AssignmentWarningDialogProps) => {
  const { t } = useLocale();
  const { warningDialog, isOpenWarnDialog, setIsOpenWarnDialog, pendingRoute, leaveWithoutAction, id } =
    props;
  const router = useRouter();
  return (
    <Dialog open={isOpenWarnDialog} onOpenChange={setIsOpenWarnDialog}>
      <DialogContent
        title={
          warningDialog === WarningDialogType.EMPTY_ASSIGNMENTS
            ? t("leave_without_assigning_anyone")
            : t("leave_without_saving_changes_title")
        }
        description={
          warningDialog === WarningDialogType.EMPTY_ASSIGNMENTS
            ? `${t("leave_without_adding_attendees")} ${t("no_availability_shown_to_bookers")}`
            : t("leave_without_saving_changes_description")
        }
        Icon="circle-alert"
        enableOverflow
        type="confirmation">
        <DialogFooter className="mt-6">
          <Button
            onClick={(e) => {
              e.preventDefault();
              setIsOpenWarnDialog(false);
              if (warningDialog === WarningDialogType.EMPTY_ASSIGNMENTS)
                router.replace(`/event-types/${id}?tabName=team`);
            }}
            color="minimal">
            {warningDialog === WarningDialogType.EMPTY_ASSIGNMENTS
              ? t("go_back_and_assign")
              : t("go_back_and_save")}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              setIsOpenWarnDialog(false);
              leaveWithoutAction.current = true;
              router.replace(pendingRoute);
            }}>
            {warningDialog === WarningDialogType.EMPTY_ASSIGNMENTS
              ? t("leave_without_assigning")
              : t("leave_without_saving")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default AssignmentWarningDialog;
