/// <reference types="react" />
import type { Props } from "react-select";
export type CheckedSelectOption = {
    avatar: string;
    label: string;
    value: string;
    priority?: number;
    weight?: number;
    weightAdjustment?: number;
    isFixed?: boolean;
    disabled?: boolean;
};
export declare const CheckedTeamSelect: ({ options, value, isRRWeightsEnabled, ...props }: Omit<Props<CheckedSelectOption, true, import("react-select").GroupBase<CheckedSelectOption>>, "value" | "onChange"> & {
    value?: readonly CheckedSelectOption[] | undefined;
    onChange: (value: readonly CheckedSelectOption[]) => void;
    isRRWeightsEnabled?: boolean | undefined;
}) => JSX.Element;
export default CheckedTeamSelect;
//# sourceMappingURL=CheckedTeamSelect.d.ts.map