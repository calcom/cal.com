/// <reference types="react" />
import type { GroupBase, InputProps, OptionProps, ControlProps } from "react-select";
import { components as reactSelectComponents } from "react-select";
import type { SelectProps } from "./Select";
export declare const InputComponent: <Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ inputClassName, ...props }: InputProps<Option, IsMulti, Group>) => JSX.Element;
export declare const OptionComponent: <Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ ...props }: OptionProps<Option, IsMulti, Group>) => JSX.Element;
export declare const ControlComponent: <Option, IsMulti extends boolean, Group extends GroupBase<Option> = GroupBase<Option>>(controlProps: ControlProps<Option, IsMulti, Group> & {
    selectProps: SelectProps<Option, IsMulti, Group>;
}) => JSX.Element;
type IconLeadingProps = {
    icon: React.ReactNode;
    children?: React.ReactNode;
} & React.ComponentProps<typeof reactSelectComponents.Control>;
export declare const IconLeading: ({ icon, children, ...props }: IconLeadingProps) => JSX.Element;
export {};
//# sourceMappingURL=components.d.ts.map