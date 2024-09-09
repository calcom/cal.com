/// <reference types="react" />
import type { GroupBase, InputProps, Props } from "react-select";
export type SelectProps<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>> = Props<Option, IsMulti, Group>;
export declare const InputComponent: <Option, IsMulti extends boolean, Group extends GroupBase<Option>>({ inputClassName, ...props }: InputProps<Option, IsMulti, Group>) => JSX.Element;
declare function Select<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ className, ...props }: SelectProps<Option, IsMulti, Group>): JSX.Element;
export default Select;
export declare function UnstyledSelect<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ ...props }: SelectProps<Option, IsMulti, Group>): JSX.Element;
//# sourceMappingURL=Select.d.ts.map