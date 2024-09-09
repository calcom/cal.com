import type { Dispatch, SetStateAction } from "react";
import { WorkflowActions } from "@calcom/prisma/enums";
interface IAddActionDialog {
    isOpenDialog: boolean;
    setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
    addAction: (action: WorkflowActions, sendTo?: string, numberRequired?: boolean, senderId?: string, senderName?: string) => void;
}
export declare const AddActionDialog: (props: IAddActionDialog) => JSX.Element | null;
export {};
//# sourceMappingURL=AddActionDialog.d.ts.map