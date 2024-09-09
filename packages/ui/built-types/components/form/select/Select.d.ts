import * as React from "react";
import type { GroupBase, Props } from "react-select";
import { Label } from "../inputs/Label";
export type SelectProps<Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>> = Props<Option, IsMulti, Group> & {
    variant?: "default" | "checkbox";
    "data-testid"?: string;
};
export declare const Select: <Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ components, variant, ...props }: Omit<Pick<import("react-select/dist/declarations/src/Select").Props<Option, IsMulti, Group>, "value" | "id" | "required" | "name" | "form" | "theme" | "className" | "aria-errormessage" | "aria-invalid" | "aria-label" | "aria-labelledby" | "onFocus" | "onBlur" | "onChange" | "onKeyDown" | "autoFocus" | "ariaLiveMessages" | "classNamePrefix" | "delimiter" | "formatOptionLabel" | "hideSelectedOptions" | "inputValue" | "inputId" | "instanceId" | "isClearable" | "isOptionSelected" | "menuPortalTarget" | "onInputChange" | "onMenuOpen" | "onMenuClose" | "onMenuScrollToTop" | "onMenuScrollToBottom"> & {
    options?: import("react-select").OptionsOrGroups<Option, Group> | undefined;
    placeholder?: React.ReactNode;
    styles?: import("react-select").StylesConfig<Option, IsMulti, Group> | undefined;
    tabIndex?: number | undefined;
    'aria-live'?: "off" | "assertive" | "polite" | undefined;
    components?: Partial<import("react-select/dist/declarations/src/components").SelectComponents<Option, IsMulti, Group>> | undefined;
    isDisabled?: boolean | undefined;
    isMulti?: IsMulti | undefined;
    isRtl?: boolean | undefined;
    backspaceRemovesValue?: boolean | undefined;
    blurInputOnSelect?: boolean | undefined;
    captureMenuScroll?: boolean | undefined;
    classNames?: import("react-select").ClassNamesConfig<Option, IsMulti, Group> | undefined;
    closeMenuOnSelect?: boolean | undefined;
    closeMenuOnScroll?: boolean | ((event: Event) => boolean) | undefined;
    controlShouldRenderValue?: boolean | undefined;
    escapeClearsValue?: boolean | undefined;
    filterOption?: ((option: import("react-select/dist/declarations/src/filters").FilterOptionOption<Option>, inputValue: string) => boolean) | null | undefined;
    formatGroupLabel?: ((group: Group) => React.ReactNode) | undefined;
    getOptionLabel?: import("react-select").GetOptionLabel<Option> | undefined;
    getOptionValue?: import("react-select").GetOptionValue<Option> | undefined;
    isLoading?: boolean | undefined;
    isOptionDisabled?: ((option: Option, selectValue: import("react-select").Options<Option>) => boolean) | undefined;
    isSearchable?: boolean | undefined;
    loadingMessage?: ((obj: {
        inputValue: string;
    }) => React.ReactNode) | undefined;
    minMenuHeight?: number | undefined;
    maxMenuHeight?: number | undefined;
    menuIsOpen?: boolean | undefined;
    menuPlacement?: import("react-select").MenuPlacement | undefined;
    menuPosition?: import("react-select").MenuPosition | undefined;
    menuShouldBlockScroll?: boolean | undefined;
    menuShouldScrollIntoView?: boolean | undefined;
    noOptionsMessage?: ((obj: {
        inputValue: string;
    }) => React.ReactNode) | undefined;
    openMenuOnFocus?: boolean | undefined;
    openMenuOnClick?: boolean | undefined;
    pageSize?: number | undefined;
    screenReaderStatus?: ((obj: {
        count: number;
    }) => string) | undefined;
    tabSelectsValue?: boolean | undefined;
    unstyled?: boolean | undefined;
} & {}, "value" | "onChange" | "inputValue" | "menuIsOpen" | "onInputChange" | "onMenuOpen" | "onMenuClose"> & Partial<Pick<import("react-select/dist/declarations/src/Select").Props<Option, IsMulti, Group>, "value" | "id" | "required" | "name" | "form" | "theme" | "className" | "aria-errormessage" | "aria-invalid" | "aria-label" | "aria-labelledby" | "onFocus" | "onBlur" | "onChange" | "onKeyDown" | "autoFocus" | "ariaLiveMessages" | "classNamePrefix" | "delimiter" | "formatOptionLabel" | "hideSelectedOptions" | "inputValue" | "inputId" | "instanceId" | "isClearable" | "isOptionSelected" | "menuPortalTarget" | "onInputChange" | "onMenuOpen" | "onMenuClose" | "onMenuScrollToTop" | "onMenuScrollToBottom"> & {
    options?: import("react-select").OptionsOrGroups<Option, Group> | undefined;
    placeholder?: React.ReactNode;
    styles?: import("react-select").StylesConfig<Option, IsMulti, Group> | undefined;
    tabIndex?: number | undefined;
    'aria-live'?: "off" | "assertive" | "polite" | undefined;
    components?: Partial<import("react-select/dist/declarations/src/components").SelectComponents<Option, IsMulti, Group>> | undefined;
    isDisabled?: boolean | undefined;
    isMulti?: IsMulti | undefined;
    isRtl?: boolean | undefined;
    backspaceRemovesValue?: boolean | undefined;
    blurInputOnSelect?: boolean | undefined;
    captureMenuScroll?: boolean | undefined;
    classNames?: import("react-select").ClassNamesConfig<Option, IsMulti, Group> | undefined;
    closeMenuOnSelect?: boolean | undefined;
    closeMenuOnScroll?: boolean | ((event: Event) => boolean) | undefined;
    controlShouldRenderValue?: boolean | undefined;
    escapeClearsValue?: boolean | undefined;
    filterOption?: ((option: import("react-select/dist/declarations/src/filters").FilterOptionOption<Option>, inputValue: string) => boolean) | null | undefined;
    formatGroupLabel?: ((group: Group) => React.ReactNode) | undefined;
    getOptionLabel?: import("react-select").GetOptionLabel<Option> | undefined;
    getOptionValue?: import("react-select").GetOptionValue<Option> | undefined;
    isLoading?: boolean | undefined;
    isOptionDisabled?: ((option: Option, selectValue: import("react-select").Options<Option>) => boolean) | undefined;
    isSearchable?: boolean | undefined;
    loadingMessage?: ((obj: {
        inputValue: string;
    }) => React.ReactNode) | undefined;
    minMenuHeight?: number | undefined;
    maxMenuHeight?: number | undefined;
    menuIsOpen?: boolean | undefined;
    menuPlacement?: import("react-select").MenuPlacement | undefined;
    menuPosition?: import("react-select").MenuPosition | undefined;
    menuShouldBlockScroll?: boolean | undefined;
    menuShouldScrollIntoView?: boolean | undefined;
    noOptionsMessage?: ((obj: {
        inputValue: string;
    }) => React.ReactNode) | undefined;
    openMenuOnFocus?: boolean | undefined;
    openMenuOnClick?: boolean | undefined;
    pageSize?: number | undefined;
    screenReaderStatus?: ((obj: {
        count: number;
    }) => string) | undefined;
    tabSelectsValue?: boolean | undefined;
    unstyled?: boolean | undefined;
} & {}> & import("react-select/dist/declarations/src/useStateManager").StateManagerAdditionalProps<Option> & {
    variant?: "default" | "checkbox" | undefined;
    "data-testid"?: string | undefined;
} & {
    innerClassNames?: {
        input?: string | undefined;
        option?: string | undefined;
        control?: string | undefined;
        singleValue?: string | undefined;
        valueContainer?: string | undefined;
        multiValue?: string | undefined;
        menu?: string | undefined;
        menuList?: string | undefined;
    } | undefined;
}) => JSX.Element;
export declare const SelectField: <Option, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>(props: {
    required?: boolean | undefined;
    name?: string | undefined;
    containerClassName?: string | undefined;
    label?: string | undefined;
    labelProps?: (React.ClassAttributes<HTMLLabelElement> & React.LabelHTMLAttributes<HTMLLabelElement>) | undefined;
    className?: string | undefined;
    error?: string | undefined;
} & Omit<Pick<import("react-select/dist/declarations/src/Select").Props<Option, IsMulti, Group>, "value" | "id" | "required" | "name" | "form" | "theme" | "className" | "aria-errormessage" | "aria-invalid" | "aria-label" | "aria-labelledby" | "onFocus" | "onBlur" | "onChange" | "onKeyDown" | "autoFocus" | "ariaLiveMessages" | "classNamePrefix" | "delimiter" | "formatOptionLabel" | "hideSelectedOptions" | "inputValue" | "inputId" | "instanceId" | "isClearable" | "isOptionSelected" | "menuPortalTarget" | "onInputChange" | "onMenuOpen" | "onMenuClose" | "onMenuScrollToTop" | "onMenuScrollToBottom"> & {
    options?: import("react-select").OptionsOrGroups<Option, Group> | undefined;
    placeholder?: React.ReactNode;
    styles?: import("react-select").StylesConfig<Option, IsMulti, Group> | undefined;
    tabIndex?: number | undefined;
    'aria-live'?: "off" | "assertive" | "polite" | undefined;
    components?: Partial<import("react-select/dist/declarations/src/components").SelectComponents<Option, IsMulti, Group>> | undefined;
    isDisabled?: boolean | undefined;
    isMulti?: IsMulti | undefined;
    isRtl?: boolean | undefined;
    backspaceRemovesValue?: boolean | undefined;
    blurInputOnSelect?: boolean | undefined;
    captureMenuScroll?: boolean | undefined;
    classNames?: import("react-select").ClassNamesConfig<Option, IsMulti, Group> | undefined;
    closeMenuOnSelect?: boolean | undefined;
    closeMenuOnScroll?: boolean | ((event: Event) => boolean) | undefined;
    controlShouldRenderValue?: boolean | undefined;
    escapeClearsValue?: boolean | undefined;
    filterOption?: ((option: import("react-select/dist/declarations/src/filters").FilterOptionOption<Option>, inputValue: string) => boolean) | null | undefined;
    formatGroupLabel?: ((group: Group) => React.ReactNode) | undefined;
    getOptionLabel?: import("react-select").GetOptionLabel<Option> | undefined;
    getOptionValue?: import("react-select").GetOptionValue<Option> | undefined;
    isLoading?: boolean | undefined;
    isOptionDisabled?: ((option: Option, selectValue: import("react-select").Options<Option>) => boolean) | undefined;
    isSearchable?: boolean | undefined;
    loadingMessage?: ((obj: {
        inputValue: string;
    }) => React.ReactNode) | undefined;
    minMenuHeight?: number | undefined;
    maxMenuHeight?: number | undefined;
    menuIsOpen?: boolean | undefined;
    menuPlacement?: import("react-select").MenuPlacement | undefined;
    menuPosition?: import("react-select").MenuPosition | undefined;
    menuShouldBlockScroll?: boolean | undefined;
    menuShouldScrollIntoView?: boolean | undefined;
    noOptionsMessage?: ((obj: {
        inputValue: string;
    }) => React.ReactNode) | undefined;
    openMenuOnFocus?: boolean | undefined;
    openMenuOnClick?: boolean | undefined;
    pageSize?: number | undefined;
    screenReaderStatus?: ((obj: {
        count: number;
    }) => string) | undefined;
    tabSelectsValue?: boolean | undefined;
    unstyled?: boolean | undefined;
} & {}, "value" | "onChange" | "inputValue" | "menuIsOpen" | "onInputChange" | "onMenuOpen" | "onMenuClose"> & Partial<Pick<import("react-select/dist/declarations/src/Select").Props<Option, IsMulti, Group>, "value" | "id" | "required" | "name" | "form" | "theme" | "className" | "aria-errormessage" | "aria-invalid" | "aria-label" | "aria-labelledby" | "onFocus" | "onBlur" | "onChange" | "onKeyDown" | "autoFocus" | "ariaLiveMessages" | "classNamePrefix" | "delimiter" | "formatOptionLabel" | "hideSelectedOptions" | "inputValue" | "inputId" | "instanceId" | "isClearable" | "isOptionSelected" | "menuPortalTarget" | "onInputChange" | "onMenuOpen" | "onMenuClose" | "onMenuScrollToTop" | "onMenuScrollToBottom"> & {
    options?: import("react-select").OptionsOrGroups<Option, Group> | undefined;
    placeholder?: React.ReactNode;
    styles?: import("react-select").StylesConfig<Option, IsMulti, Group> | undefined;
    tabIndex?: number | undefined;
    'aria-live'?: "off" | "assertive" | "polite" | undefined;
    components?: Partial<import("react-select/dist/declarations/src/components").SelectComponents<Option, IsMulti, Group>> | undefined;
    isDisabled?: boolean | undefined;
    isMulti?: IsMulti | undefined;
    isRtl?: boolean | undefined;
    backspaceRemovesValue?: boolean | undefined;
    blurInputOnSelect?: boolean | undefined;
    captureMenuScroll?: boolean | undefined;
    classNames?: import("react-select").ClassNamesConfig<Option, IsMulti, Group> | undefined;
    closeMenuOnSelect?: boolean | undefined;
    closeMenuOnScroll?: boolean | ((event: Event) => boolean) | undefined;
    controlShouldRenderValue?: boolean | undefined;
    escapeClearsValue?: boolean | undefined;
    filterOption?: ((option: import("react-select/dist/declarations/src/filters").FilterOptionOption<Option>, inputValue: string) => boolean) | null | undefined;
    formatGroupLabel?: ((group: Group) => React.ReactNode) | undefined;
    getOptionLabel?: import("react-select").GetOptionLabel<Option> | undefined;
    getOptionValue?: import("react-select").GetOptionValue<Option> | undefined;
    isLoading?: boolean | undefined;
    isOptionDisabled?: ((option: Option, selectValue: import("react-select").Options<Option>) => boolean) | undefined;
    isSearchable?: boolean | undefined;
    loadingMessage?: ((obj: {
        inputValue: string;
    }) => React.ReactNode) | undefined;
    minMenuHeight?: number | undefined;
    maxMenuHeight?: number | undefined;
    menuIsOpen?: boolean | undefined;
    menuPlacement?: import("react-select").MenuPlacement | undefined;
    menuPosition?: import("react-select").MenuPosition | undefined;
    menuShouldBlockScroll?: boolean | undefined;
    menuShouldScrollIntoView?: boolean | undefined;
    noOptionsMessage?: ((obj: {
        inputValue: string;
    }) => React.ReactNode) | undefined;
    openMenuOnFocus?: boolean | undefined;
    openMenuOnClick?: boolean | undefined;
    pageSize?: number | undefined;
    screenReaderStatus?: ((obj: {
        count: number;
    }) => string) | undefined;
    tabSelectsValue?: boolean | undefined;
    unstyled?: boolean | undefined;
} & {}> & import("react-select/dist/declarations/src/useStateManager").StateManagerAdditionalProps<Option> & {
    variant?: "default" | "checkbox" | undefined;
    "data-testid"?: string | undefined;
}) => JSX.Element;
/**
 * TODO: It should replace Select after through testing
 */
export declare function SelectWithValidation<Option extends {
    label: string;
    value: string;
}, IsMulti extends boolean = false, Group extends GroupBase<Option> = GroupBase<Option>>({ required, onChange, value, ...remainingProps }: SelectProps<Option, IsMulti, Group> & {
    required?: boolean;
}): JSX.Element;
//# sourceMappingURL=Select.d.ts.map