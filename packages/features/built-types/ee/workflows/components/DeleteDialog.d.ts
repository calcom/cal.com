import type { Dispatch, SetStateAction } from "react";
interface IDeleteDialog {
    isOpenDialog: boolean;
    setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
    workflowId: number;
    additionalFunction: () => Promise<boolean | void>;
}
export declare const DeleteDialog: (props: IDeleteDialog) => JSX.Element;
export {};
//# sourceMappingURL=DeleteDialog.d.ts.map