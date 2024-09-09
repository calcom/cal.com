import type { Dispatch, SetStateAction } from "react";
interface ISearchDialog {
    isOpenDialog: boolean;
    setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
    onSave: (url: string) => void;
}
export declare const SearchDialog: (props: ISearchDialog) => JSX.Element;
export {};
//# sourceMappingURL=SearchDialog.d.ts.map