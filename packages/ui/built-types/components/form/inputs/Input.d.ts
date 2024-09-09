import type { ReactNode } from "react";
import React from "react";
import { Label } from "./Label";
import type { InputFieldProps } from "./types";
export declare function InputLeading(props: JSX.IntrinsicElements["div"]): JSX.Element;
export declare const PasswordField: React.ForwardRefExoticComponent<Pick<InputFieldProps, "label" | "error" | "t" | "key" | keyof React.InputHTMLAttributes<HTMLInputElement> | "containerClassName" | "labelProps" | "hintErrors" | "isFullWidth" | "onClickAddon" | "LockedIcon" | "hint" | "addOnLeading" | "addOnSuffix" | "inputIsFullWidth" | "addOnFilled" | "addOnClassname" | "labelSrOnly" | "showAsteriskIndicator" | "dataTestid" | "noLabel" | "labelClassName"> & React.RefAttributes<HTMLInputElement>>;
export declare const EmailInput: React.ForwardRefExoticComponent<Pick<InputFieldProps, "label" | "error" | "t" | "key" | keyof React.InputHTMLAttributes<HTMLInputElement> | "containerClassName" | "labelProps" | "hintErrors" | "isFullWidth" | "onClickAddon" | "LockedIcon" | "hint" | "addOnLeading" | "addOnSuffix" | "inputIsFullWidth" | "addOnFilled" | "addOnClassname" | "labelSrOnly" | "showAsteriskIndicator" | "dataTestid" | "noLabel" | "labelClassName"> & React.RefAttributes<HTMLInputElement>>;
export declare const EmailField: React.ForwardRefExoticComponent<Pick<InputFieldProps, "label" | "error" | "t" | "key" | keyof React.InputHTMLAttributes<HTMLInputElement> | "containerClassName" | "labelProps" | "hintErrors" | "isFullWidth" | "onClickAddon" | "LockedIcon" | "hint" | "addOnLeading" | "addOnSuffix" | "inputIsFullWidth" | "addOnFilled" | "addOnClassname" | "labelSrOnly" | "showAsteriskIndicator" | "dataTestid" | "noLabel" | "labelClassName"> & React.RefAttributes<HTMLInputElement>>;
export declare const TextArea: React.ForwardRefExoticComponent<Pick<React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>, "key" | keyof React.TextareaHTMLAttributes<HTMLTextAreaElement>> & React.RefAttributes<HTMLTextAreaElement>>;
type TextAreaFieldProps = {
    label?: ReactNode;
    t?: (key: string) => string;
} & React.ComponentProps<typeof TextArea> & {
    name: string;
    labelProps?: React.ComponentProps<typeof Label>;
};
export declare const TextAreaField: React.ForwardRefExoticComponent<Pick<TextAreaFieldProps, "label" | "t" | "key" | "labelProps" | keyof React.TextareaHTMLAttributes<HTMLTextAreaElement>> & React.RefAttributes<HTMLTextAreaElement>>;
export declare function FieldsetLegend(props: JSX.IntrinsicElements["legend"]): JSX.Element;
export declare function InputGroupBox(props: JSX.IntrinsicElements["div"]): JSX.Element;
export declare const NumberInput: React.ForwardRefExoticComponent<Pick<InputFieldProps, "label" | "error" | "t" | "key" | keyof React.InputHTMLAttributes<HTMLInputElement> | "containerClassName" | "labelProps" | "hintErrors" | "isFullWidth" | "onClickAddon" | "LockedIcon" | "hint" | "addOnLeading" | "addOnSuffix" | "inputIsFullWidth" | "addOnFilled" | "addOnClassname" | "labelSrOnly" | "showAsteriskIndicator" | "dataTestid" | "noLabel" | "labelClassName"> & React.RefAttributes<HTMLInputElement>>;
export declare const FilterSearchField: React.ForwardRefExoticComponent<Pick<InputFieldProps, "label" | "error" | "t" | "key" | keyof React.InputHTMLAttributes<HTMLInputElement> | "containerClassName" | "labelProps" | "hintErrors" | "isFullWidth" | "onClickAddon" | "LockedIcon" | "hint" | "addOnLeading" | "addOnSuffix" | "inputIsFullWidth" | "addOnFilled" | "addOnClassname" | "labelSrOnly" | "showAsteriskIndicator" | "dataTestid" | "noLabel" | "labelClassName"> & React.RefAttributes<HTMLInputElement>>;
export {};
//# sourceMappingURL=Input.d.ts.map