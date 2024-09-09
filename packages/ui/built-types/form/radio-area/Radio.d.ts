import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";
export declare const Group: (props: RadioGroupPrimitive.RadioGroupProps & {
    children: ReactNode;
}) => JSX.Element;
export declare const Radio: (props: RadioGroupPrimitive.RadioGroupItemProps & {
    children: ReactNode;
}) => JSX.Element;
export declare const Indicator: ({ disabled }: {
    disabled?: boolean | undefined;
}) => JSX.Element;
export declare const Label: (props: JSX.IntrinsicElements["label"] & {
    disabled?: boolean;
}) => JSX.Element;
export declare const RadioField: ({ label, disabled, id, value, className, }: {
    label: string | ReactNode;
    disabled?: boolean | undefined;
    id: string;
    value: string;
    className?: string | undefined;
}) => JSX.Element;
//# sourceMappingURL=Radio.d.ts.map