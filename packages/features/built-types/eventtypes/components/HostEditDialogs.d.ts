import type { Dispatch, SetStateAction } from "react";
import type { CheckedSelectOption } from "./CheckedTeamSelect";
interface IDialog {
    isOpenDialog: boolean;
    setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
    option: CheckedSelectOption;
    onChange: (value: readonly CheckedSelectOption[]) => void;
}
export declare const PriorityDialog: (props: IDialog) => JSX.Element;
export declare const weightDescription: JSX.Element;
export declare function sortHosts(hostA: {
    priority: number | null;
    weight: number | null;
}, hostB: {
    priority: number | null;
    weight: number | null;
}, isRRWeightsEnabled: boolean): number;
export declare const WeightDialog: (props: IDialog) => JSX.Element;
export {};
//# sourceMappingURL=HostEditDialogs.d.ts.map