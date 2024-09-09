/// <reference types="react" />
import type { GroupBase, Props, InputProps } from "react-select";
export type SelectProps<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>> = Props<Option, IsMulti, Group>;
export declare const InputComponent: <Option, IsMulti extends boolean, Group extends GroupBase<Option>>({ inputClassName, ...props }: InputProps<Option, IsMulti, Group>) => JSX.Element;
declare function Select<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ className, ...props }: SelectProps<Option, IsMulti, Group>): JSX.Element;
export declare function SelectWithValidation<Option extends {
    label: string;
    value: string;
}, isMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ required, onChange, value, ...remainingProps }: SelectProps<Option, isMulti, Group> & {
    required?: boolean;
}): JSX.Element;
export default Select;
//# sourceMappingURL=Select.d.ts.map