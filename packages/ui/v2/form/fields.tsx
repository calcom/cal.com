import { useId } from "@radix-ui/react-id";
import React, { forwardRef, ReactElement, ReactNode, Ref } from "react";
import { Info, Circle, Check, X } from "react-feather";
import { FieldValues, FormProvider, SubmitHandler, useFormContext, UseFormReturn } from "react-hook-form";

import classNames from "@calcom/lib/classNames";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/ui/v2/notfications";

import { Alert } from "../Alert";

type InputProps = Omit<JSX.IntrinsicElements["input"], "name"> & { name: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={classNames(
        "my-[7px] block h-9 w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm hover:border-gray-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1 sm:text-sm",
        props.className
      )}
    />
  );
});

export function Label(props: JSX.IntrinsicElements["label"]) {
  return (
    <label {...props} className={classNames("block text-sm font-medium text-gray-700", props.className)}>
      {props.children}
    </label>
  );
}

export function InputLeading(props: JSX.IntrinsicElements["div"]) {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
      {props.children}
    </span>
  );
}

type InputFieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  hintErrors?: string[];
  addOnLeading?: ReactNode;
  addOnSuffix?: ReactNode;
  addOnFilled?: boolean;
  error?: string;
  labelSrOnly?: boolean;
  containerClassName?: string;
} & React.ComponentProps<typeof Input> & {
    labelProps?: React.ComponentProps<typeof Label>;
  };

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(props, ref) {
  const id = useId();
  const { t } = useLocale();
  const methods = useFormContext();
  const {
    label = t(props.name),
    labelProps,
    /** Prevents displaying untranslated placeholder keys */
    placeholder = t(props.name + "_placeholder") !== props.name + "_placeholder"
      ? t(props.name + "_placeholder")
      : "",
    className,
    addOnLeading,
    addOnSuffix,
    addOnFilled = true,
    hint,
    hintErrors,
    labelSrOnly,
    containerClassName,
    ...passThrough
  } = props;

  return (
    <div className={classNames(containerClassName)}>
      {!!props.name && (
        <Label
          htmlFor={id}
          {...labelProps}
          className={classNames(labelSrOnly && "sr-only", props.error && "text-red-900")}>
          {label}
        </Label>
      )}
      {addOnLeading || addOnSuffix ? (
        <div
          className={classNames(
            " mb-1 flex items-center rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-800 focus-within:ring-offset-2",
            addOnSuffix && "group flex-row-reverse"
          )}>
          <div
            className={classNames(
              "h-9 border border-gray-300",
              addOnFilled && "bg-gray-100",
              addOnLeading && "rounded-l-md border-r-0",
              addOnSuffix && "rounded-r-md border-l-0"
            )}>
            <div
              className={classNames(
                "flex h-full flex-col justify-center px-3 text-sm",
                props.error && "text-red-900"
              )}>
              <span>{addOnLeading || addOnSuffix}</span>
            </div>
          </div>
          <Input
            id={id}
            placeholder={placeholder}
            className={classNames(
              className,
              addOnLeading && "rounded-l-none",
              addOnSuffix && "rounded-r-none",
              "!my-0 !ring-0"
            )}
            {...passThrough}
            ref={ref}
          />
        </div>
      ) : (
        <Input id={id} placeholder={placeholder} className={className} {...passThrough} ref={ref} />
      )}
      {methods?.formState?.errors[props.name] && methods?.formState?.errors[props.name].message && (
        <div className="text-gray mt-2 flex items-center text-sm text-red-700">
          <Info className="mr-1 h-3 w-3" />
          {methods.formState.errors[props.name].message}
        </div>
      )}
      {hintErrors && (
        <div className="text-gray mt-2 flex items-center text-sm text-gray-700">
          {methods?.formState?.errors[props.name] !== undefined ? (
            <ul className="then ml-2">
              {hintErrors.map((errorKey) => {
                const error =
                  methods?.formState?.errors[props.name][errorKey] ||
                  methods?.formState?.errors[props.name].message;
                const submitted = methods?.formState.isSubmitted;
                return (
                  <li
                    key={errorKey}
                    className={error !== undefined ? (submitted ? "text-red-700" : "") : "text-green-600"}>
                    {error !== undefined ? (
                      submitted ? (
                        <X size="12" strokeWidth="3" className="-ml-1 mr-2 inline-block" />
                      ) : (
                        <Circle fill="currentColor" size="5" className="mr-2 inline-block" />
                      )
                    ) : (
                      <Check size="12" strokeWidth="3" className="-ml-1 mr-2 inline-block" />
                    )}
                    {error?.message || t(`${props.name}_hint_${errorKey}`)}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="otherwise ml-2">
              {hintErrors.map((errorKey) => {
                const dirty = methods?.formState.dirtyFields[props.name];
                return (
                  <li key={errorKey} className={!!dirty ? "text-green-600" : ""}>
                    {!!dirty ? (
                      <Check size="12" strokeWidth="3" className="-ml-1 mr-2 inline-block" />
                    ) : (
                      <Circle fill="currentColor" size="5" className="mr-2 inline-block" />
                    )}
                    {t(`${props.name}_hint_${errorKey}`)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {hint && <div className="text-gray mt-2 flex items-center text-sm text-gray-700">{hint}</div>}
    </div>
  );
});

export const TextField = forwardRef<HTMLInputElement, InputFieldProps>(function TextField(props, ref) {
  return <InputField ref={ref} {...props} />;
});

export const PasswordField = forwardRef<HTMLInputElement, InputFieldProps>(function PasswordField(
  props,
  ref
) {
  return <InputField type="password" placeholder="•••••••••••••" ref={ref} {...props} />;
});

export const EmailInput = forwardRef<HTMLInputElement, InputFieldProps>(function EmailInput(props, ref) {
  return (
    <Input
      ref={ref}
      type="email"
      autoCapitalize="none"
      autoComplete="email"
      autoCorrect="off"
      inputMode="email"
      {...props}
    />
  );
});

export const EmailField = forwardRef<HTMLInputElement, InputFieldProps>(function EmailField(props, ref) {
  return (
    <InputField
      ref={ref}
      type="email"
      autoCapitalize="none"
      autoComplete="email"
      autoCorrect="off"
      inputMode="email"
      {...props}
    />
  );
});

type TextAreaProps = Omit<JSX.IntrinsicElements["textarea"], "name"> & { name: string };

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaInput(props, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={classNames(
        "my-2 block h-9 w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm hover:border-gray-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1 sm:text-sm",
        props.className
      )}
    />
  );
});

type TextAreaFieldProps = {
  label?: ReactNode;
} & React.ComponentProps<typeof TextArea> & {
    labelProps?: React.ComponentProps<typeof Label>;
  };

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextField(
  props,
  ref
) {
  const id = useId();
  const { t } = useLocale();
  const methods = useFormContext();
  const {
    label = t(props.name as string),
    labelProps,
    /** Prevents displaying untranslated placeholder keys */
    placeholder = t(props.name + "_placeholder") !== props.name + "_placeholder"
      ? t(props.name + "_placeholder")
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
      <TextArea ref={ref} placeholder={placeholder} {...passThrough} />
      {methods?.formState?.errors[props.name] && (
        <Alert className="mt-1" severity="error" message={methods.formState.errors[props.name].message} />
      )}
    </div>
  );
});

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

export const Form = forwardRef(PlainForm) as <T extends FieldValues>(
  p: FormProps<T> & { ref?: Ref<HTMLFormElement> }
) => ReactElement;

export function FieldsetLegend(props: JSX.IntrinsicElements["legend"]) {
  return (
    <legend {...props} className={classNames("text-sm font-medium text-gray-700", props.className)}>
      {props.children}
    </legend>
  );
}

export function InputGroupBox(props: JSX.IntrinsicElements["div"]) {
  return (
    <div
      {...props}
      className={classNames("space-y-2 rounded-sm border border-gray-300 bg-white p-2", props.className)}>
      {props.children}
    </div>
  );
}
