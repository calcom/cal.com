import type { ReactElement, Ref } from "react";
import React from "react";
import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";
type FormProps<T extends object> = {
    form: UseFormReturn<T>;
    handleSubmit: SubmitHandler<T>;
} & Omit<JSX.IntrinsicElements["form"], "onSubmit">;
export declare const Form: <T extends FieldValues>(p: {
    form: UseFormReturn<T, any>;
    handleSubmit: SubmitHandler<T>;
} & Omit<React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, "onSubmit"> & {
    ref?: Ref<HTMLFormElement> | undefined;
}) => ReactElement;
export {};
//# sourceMappingURL=Form.d.ts.map