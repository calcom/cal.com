import React from "react";
import { UnstyledSelect } from "../../..";
export declare const InputFieldWithSelect: React.ForwardRefExoticComponent<Pick<{
    label?: React.ReactNode;
    LockedIcon?: React.ReactNode;
    hint?: React.ReactNode;
    hintErrors?: string[] | undefined;
    addOnLeading?: React.ReactNode;
    addOnSuffix?: React.ReactNode;
    inputIsFullWidth?: boolean | undefined;
    addOnFilled?: boolean | undefined;
    addOnClassname?: string | undefined;
    error?: string | undefined;
    labelSrOnly?: boolean | undefined;
    containerClassName?: string | undefined;
    showAsteriskIndicator?: boolean | undefined;
    t?: ((key: string) => string) | undefined;
    dataTestid?: string | undefined;
    noLabel?: boolean | undefined;
    onClickAddon?: (() => void) | undefined;
} & Pick<import("./types").InputProps, "key" | keyof React.InputHTMLAttributes<HTMLInputElement> | "isFullWidth"> & React.RefAttributes<HTMLInputElement> & {
    labelProps?: any;
    labelClassName?: string | undefined;
} & {
    selectProps: typeof UnstyledSelect;
}, "label" | "error" | "t" | "key" | keyof React.InputHTMLAttributes<HTMLInputElement> | "selectProps" | "containerClassName" | "labelProps" | "hintErrors" | "isFullWidth" | "onClickAddon" | "LockedIcon" | "hint" | "addOnLeading" | "addOnSuffix" | "inputIsFullWidth" | "addOnFilled" | "addOnClassname" | "labelSrOnly" | "showAsteriskIndicator" | "dataTestid" | "noLabel" | "labelClassName"> & React.RefAttributes<HTMLInputElement>>;
//# sourceMappingURL=InputFieldWithSelect.d.ts.map