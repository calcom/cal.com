/// <reference types="react" />
import type { Props } from "react-select";
export type CheckedUserSelectOption = {
    avatar: string;
    label: string;
    value: string;
    disabled?: boolean;
};
export declare const CheckedUserSelect: ({ options, value, ...props }: Omit<Props<CheckedUserSelectOption, true, import("react-select").GroupBase<CheckedUserSelectOption>>, "value" | "onChange"> & {
    value?: readonly CheckedUserSelectOption[] | undefined;
    onChange: (value: readonly CheckedUserSelectOption[]) => void;
}) => JSX.Element;
export default CheckedUserSelect;
//# sourceMappingURL=CheckedUserSelect.d.ts.map