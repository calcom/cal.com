import { useId } from "@radix-ui/react-id";
import type { ReactElement, ReactNode, Ref } from "react";
import React from "react";
import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";
import { FormProvider, useFormContext } from "react-hook-form";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

import { Alert } from "../alert";
import { showToast } from "../toast";

type InputProps = Omit<JSX.IntrinsicElements["input"], "name"> & { name: string };

export const Input = function Input({
  ref: forwardedRef,
  ...props
}: InputProps & {
  ref: React.RefObject<HTMLInputElement>;
}) {
  return (
    <input
      {...props}
      ref={forwardedRef}
      className={classNames(
        "border-default mt-1 block w-full rounded-sm border px-3 py-2 shadow-sm focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800 sm:text-sm",
        props.className
      )}
    />
  );
};

export function Label(props: JSX.IntrinsicElements["label"]) {
  return (
    <label {...props} className={classNames("text-default block text-sm font-medium", props.className)}>
      {props.children}
    </label>
  );
}

export function InputLeading(props: JSX.IntrinsicElements["div"]) {
  return (
    <span className="bg-muted border-default text-subtle inline-flex flex-shrink-0 items-center rounded-l-sm border border-r-0 px-3 sm:text-sm">
      {props.children}
    </span>
  );
}

type InputFieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  addOnLeading?: ReactNode;
} & React.ComponentProps<typeof Input> & {
    labelProps?: React.ComponentProps<typeof Label>;
  };

const InputField = function InputField({
  ref: forwardedRef,
  ...props
}: InputFieldProps & {
  ref: React.RefObject<HTMLInputElement>;
}) {
  const id = useId();
  const { t } = useLocale();
  const methods = useFormContext();
  const {
    label = t(props.name),
    labelProps,
    placeholder = t(`${props.name}_placeholder`) !== `${props.name}_placeholder`
      ? t(`${props.name}_placeholder`)
      : "",
    className,
    addOnLeading,
    hint,
    ...passThrough
  } = props;
  return (
    <div>
      {!!props.name && (
        <Label htmlFor={id} {...labelProps}>
          {label}
        </Label>
      )}
      {addOnLeading ? (
        <div className="mt-1 flex rounded-md shadow-sm">
          {addOnLeading}
          <Input
            id={id}
            placeholder={placeholder}
            className={classNames("mt-0", props.addOnLeading && "rounded-l-none", className)}
            {...passThrough}
            ref={forwardedRef}
          />
        </div>
      ) : (
        <Input id={id} placeholder={placeholder} className={className} {...passThrough} ref={forwardedRef} />
      )}
      {hint}
      {methods?.formState?.errors[props.name]?.message && (
        <Alert
          className="mt-1"
          severity="error"
          message={<>{methods.formState.errors[props.name]?.message}</>}
        />
      )}
    </div>
  );
};

export const TextField = function TextField({
  ref: forwardedRef,
  ...props
}: InputFieldProps & {
  ref: React.RefObject<HTMLInputElement>;
}) {
  return <InputField ref={forwardedRef} {...props} />;
};

export const PasswordField = function PasswordField({
  ref: forwardedRef,
  ...props
}: InputFieldProps & {
  ref: React.RefObject<HTMLInputElement>;
}) {
  return (
    <InputField
      data-testid="password"
      type="password"
      placeholder="•••••••••••••"
      ref={forwardedRef}
      {...props}
    />
  );
};

export const EmailInput = function EmailInput({
  ref: forwardedRef,
  ...props
}: InputFieldProps & {
  ref: React.RefObject<HTMLInputElement>;
}) {
  return (
    <Input
      ref={forwardedRef}
      type="email"
      autoCapitalize="none"
      autoComplete="email"
      autoCorrect="off"
      inputMode="email"
      {...props}
    />
  );
};

export const EmailField = function EmailField({
  ref: forwardedRef,
  ...props
}: InputFieldProps & {
  ref: React.RefObject<HTMLInputElement>;
}) {
  return (
    <InputField
      ref={forwardedRef}
      type="email"
      autoCapitalize="none"
      autoComplete="email"
      autoCorrect="off"
      inputMode="email"
      {...props}
    />
  );
};

type TextAreaProps = Omit<JSX.IntrinsicElements["textarea"], "name"> & { name: string };

export const TextArea = function TextAreaInput({
  ref: forwardedRef,
  ...props
}: TextAreaProps & {
  ref: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      ref={forwardedRef}
      {...props}
      className={classNames(
        "border-default block w-full rounded-sm shadow-sm focus:border-neutral-900 focus:ring-neutral-900 sm:text-sm",
        props.className
      )}
    />
  );
};

type TextAreaFieldProps = {
  label?: ReactNode;
} & React.ComponentProps<typeof TextArea> & {
    labelProps?: React.ComponentProps<typeof Label>;
  };

export const TextAreaField = function TextField({
  ref: forwardedRef,
  ...props
}: TextAreaFieldProps & {
  ref: React.RefObject<HTMLTextAreaElement>;
}) {
  const id = useId();
  const { t } = useLocale();
  const methods = useFormContext();
  const {
    label = t(props.name as string),
    labelProps,
    placeholder = t(`${props.name}_placeholder`) !== `${props.name}_placeholder`
      ? t(`${props.name}_placeholder`)
      : "",
    ...passThrough
  } = props;
  return (
    <div>
      {!!props.name && (
        <Label htmlFor={id} {...labelProps}>
          {label}
        </Label>
      )}
      <TextArea ref={forwardedRef} placeholder={placeholder} {...passThrough} />
      {methods?.formState?.errors[props.name]?.message && (
        <Alert
          className="mt-1"
          severity="error"
          message={<>{methods.formState.errors[props.name]?.message}</>}
        />
      )}
    </div>
  );
};

type FormProps<T extends object> = { form: UseFormReturn<T>; handleSubmit: SubmitHandler<T> } & Omit<
  JSX.IntrinsicElements["form"],
  "onSubmit"
>;

const PlainForm = <T extends FieldValues>(props: FormProps<T>, ref: Ref<HTMLFormElement>) => {
  const { form, handleSubmit, ...passThrough } = props;

  return (
    <FormProvider {...form}>
      <form
        ref={ref}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();

          form
            .handleSubmit(handleSubmit)(event)
            .catch((err) => {
              showToast(`${getErrorFromUnknown(err).message}`, "error");
            });
        }}
        {...passThrough}>
        {
          /* @see https://react-hook-form.com/advanced-usage/#SmartFormComponent */
          React.Children.map(props.children, (child) => {
            return typeof child !== "string" &&
              typeof child !== "number" &&
              typeof child !== "boolean" &&
              child &&
              "props" in child &&
              child.props.name
              ? React.createElement(child.type, {
                  ...{
                    ...child.props,
                    register: form.register,
                    key: child.props.name,
                  },
                })
              : child;
          })
        }
      </form>
    </FormProvider>
  );
};

export const Form = function Form<T extends FieldValues>({
  ref: forwardedRef,
  ...props
}: FormProps<T> & {
  ref?: React.RefObject<HTMLFormElement>;
}): ReactElement {
  return PlainForm(props, forwardedRef);
};

export function FieldsetLegend(props: JSX.IntrinsicElements["legend"]) {
  return (
    <legend {...props} className={classNames("text-default text-sm font-medium", props.className)}>
      {props.children}
    </legend>
  );
}

export function InputGroupBox(props: JSX.IntrinsicElements["div"]) {
  return (
    <div
      {...props}
      className={classNames("bg-default border-default space-y-2 rounded-sm border p-2", props.className)}>
      {props.children}
    </div>
  );
}
