import type { Dispatch, SetStateAction } from "react";
import type { Props } from "react-select";
export type Option = {
    value: string;
    label: string;
};
type MultiSelectionCheckboxesProps = {
    options: {
        label: string;
        value: string;
    }[];
    setSelected: Dispatch<SetStateAction<Option[]>>;
    selected: Option[];
    setValue: (s: Option[]) => unknown;
    countText?: string;
};
export default function MultiSelectCheckboxes({ options, isLoading, selected, setSelected, setValue, className, isDisabled, countText, }: Omit<Props, "options"> & MultiSelectionCheckboxesProps): JSX.Element;
export {};
//# sourceMappingURL=MultiSelectCheckboxes.d.ts.map