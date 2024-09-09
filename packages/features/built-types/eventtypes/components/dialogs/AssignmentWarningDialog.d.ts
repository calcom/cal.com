import type { Dispatch, SetStateAction } from "react";
import type { MutableRefObject } from "react";
interface AssignmentWarningDialogProps {
    isOpenAssignmentWarnDialog: boolean;
    setIsOpenAssignmentWarnDialog: Dispatch<SetStateAction<boolean>>;
    pendingRoute: string;
    leaveWithoutAssigningHosts: MutableRefObject<boolean>;
    id: number;
}
declare const AssignmentWarningDialog: (props: AssignmentWarningDialogProps) => JSX.Element;
export default AssignmentWarningDialog;
//# sourceMappingURL=AssignmentWarningDialog.d.ts.map