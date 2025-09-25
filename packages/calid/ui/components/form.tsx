import * as React from "react";
import type { UseFormReturn, ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { Controller, FormProvider, useFormContext } from "react-hook-form";

// Form wrapper that includes <form> tag and auto handleSubmit
interface FormProps<TFieldValues extends FieldValues = FieldValues> extends UseFormReturn<TFieldValues> {
  form: UseFormReturn<TFieldValues>;
  children: React.ReactNode;
  onSubmit?: (values: TFieldValues) => void;
  className?: string;
}

function Form<TFieldValues extends FieldValues = FieldValues>({
  form,
  children,
  onSubmit,
  className,
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit ? form.handleSubmit(onSubmit) : undefined} className={className}>
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

export { Form, FormField };
