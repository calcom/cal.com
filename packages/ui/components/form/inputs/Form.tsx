import type { ReactElement, Ref } from "react";
import React from "react";
import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";
import { FormProvider } from "react-hook-form";

import { getErrorFromUnknown } from "@calcom/lib/errors";

import { showToast } from "../../toast";

type FormProps<T extends object> = { form: UseFormReturn<T>; handleSubmit: SubmitHandler<T> } & Omit<
  JSX.IntrinsicElements["form"],
  "onSubmit"
>;

const PlainForm = <T extends FieldValues>({
  ref: forwardedRef,
  form,
  handleSubmit,
  ...passThrough
}: FormProps<T> & {
  ref: Ref<HTMLFormElement>;
}) => {
  return (
    <FormProvider {...form}>
      <form
        ref={forwardedRef}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();

          form
            .handleSubmit(handleSubmit)(event)
            .catch((err) => {
              // FIXME: Booking Pages don't have toast, so this error is never shown
              showToast(`${getErrorFromUnknown(err).message}`, "error");
            });
        }}
        {...passThrough}>
        {passThrough.children}
      </form>
    </FormProvider>
  );
};

export const Form = PlainForm as <T extends FieldValues>(
  p: FormProps<T> & { ref?: Ref<HTMLFormElement> }
) => ReactElement;
