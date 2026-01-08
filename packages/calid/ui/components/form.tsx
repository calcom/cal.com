import * as React from "react";
import type { UseFormReturn, ControllerProps, FieldPath, FieldValues, FieldErrors } from "react-hook-form";
import { Controller, FormProvider, useFormContext } from "react-hook-form";

import { getErrorFromUnknown } from "@calcom/lib/errors";

import { triggerToast } from "./toast";

// Form wrapper that includes <form> tag and auto handleSubmit
interface FormProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  children: React.ReactNode;
  onSubmit?: (values: TFieldValues) => void | Promise<void>;
  className?: string;
  id?: string;
  showValidationToast?: boolean;
}

function getFirstErrorMessage<T extends FieldValues>(errors: FieldErrors<T>): string | null {
  for (const key in errors) {
    const error = errors[key];
    if (!error) continue;

    // Handle nested errors (e.g., nested objects or arrays)
    if (typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }

    // Recursively check nested field errors
    if (typeof error === "object") {
      const nestedMessage = getFirstErrorMessage(error as FieldErrors<T>);
      if (nestedMessage) return nestedMessage;
    }
  }
  return null;
}

function Form<TFieldValues extends FieldValues = FieldValues>({
  form,
  children,
  onSubmit,
  className,
  id,
  showValidationToast = true,
}: FormProps<TFieldValues>) {
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!onSubmit) return;

    try {
      await form.handleSubmit(onSubmit, (errors) => {
        if (showValidationToast) {
          const message = getFirstErrorMessage(errors);
          if (message) {
            triggerToast(message, "error");
          }
        }
      })(event);
    } catch (err) {
      console.error("Form submission error:", err);
      triggerToast(getErrorFromUnknown(err).message, "error");
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleFormSubmit} className={className} id={id}>
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
