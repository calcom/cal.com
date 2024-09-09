/// <reference types="react" />
import { Label } from "../../../components/form/inputs/Label";
export declare const BooleanToggleGroup: ({ defaultValue, value, disabled, onValueChange, variant, ...passThrough }: {
    defaultValue?: boolean | undefined;
    value?: boolean | undefined;
    onValueChange?: ((value?: boolean) => void) | undefined;
    disabled?: boolean | undefined;
    variant?: "default" | "small" | undefined;
}) => JSX.Element | null;
export declare const BooleanToggleGroupField: (props: {
    defaultValue?: boolean | undefined;
    value?: boolean | undefined;
    onValueChange?: ((value?: boolean) => void) | undefined;
    disabled?: boolean | undefined;
    variant?: "default" | "small" | undefined;
} & {
    label?: string | undefined;
    containerClassName?: string | undefined;
    name?: string | undefined;
    labelProps?: (import("react").ClassAttributes<HTMLLabelElement> & import("react").LabelHTMLAttributes<HTMLLabelElement>) | undefined;
    className?: string | undefined;
    error?: string | undefined;
}) => JSX.Element;
//# sourceMappingURL=BooleanToggleGroup.d.ts.map