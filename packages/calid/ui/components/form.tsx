import * as React from "react";
import type { UseFormReturn, ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { Controller, FormProvider, useFormContext } from "react-hook-form";

import classNames from "@calcom/ui/classNames";

// Form wrapper that includes <form> tag and auto handleSubmit
interface FormProps<TFieldValues extends FieldValues = FieldValues> extends UseFormReturn<TFieldValues> {
  children: React.ReactNode;
  onSubmit?: (values: TFieldValues) => void;
  className?: string;
}

function Form<TFieldValues extends FieldValues = FieldValues>({
  children,
  onSubmit,
  className,
  ...methods
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit ? methods.handleSubmit(onSubmit) : undefined} className={className}>
        {children}
      </form>
    </FormProvider>
  );
}

// Context to track the current field
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

export const useFormField = () => {
  const ctx = React.useContext(FormFieldContext);
  const methods = useFormContext();
  const fieldState = methods.getFieldState(ctx.name);
  return { name: ctx.name, ...fieldState, form: methods };
};

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

function FormMessage({ className }: { className?: string }) {
  const { error } = useFormField();
  if (!error) return null;
  return <p className={classNames(className, "text-destructive text-sm")}>{error.message?.toString()}</p>;
}

export { Form, FormField, FormMessage };
