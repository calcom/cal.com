import type { ReactElement, ReactNode, Ref } from "react";
import React, { forwardRef, useCallback, useId, useState } from "react";
import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";
import { FormProvider, useFormContext } from "react-hook-form";

import classNames from "@calcom/lib/classNames";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Alert, showToast, Skeleton, Tooltip, UnstyledSelect } from "../../..";
import { FiEye, FiEyeOff, FiX } from "../../icon";
import { HintsOrErrors } from "./HintOrErrors";
import { Label } from "./Label";

type InputProps = JSX.IntrinsicElements["input"] & { isFullWidth?: boolean; isStandaloneField?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { isFullWidth = true, isStandaloneField = true, ...props },
  ref
) {
  return (
    <input
      {...props}
      ref={ref}
      className={classNames(
        // @TODO: In globals.css there's an override that disabled the box shadow on inputs,
        // This causes the focus state to be different for different types of fields.
        "dark:text-darkgray-900 dark:disabled:text-darkgray-500 dark:disabled:bg-darkgray-100 dark:border-darkgray-500 dark:bg-darkgray-100 dark:focus:border-darkgray-500 dark:disabled:hover:border-darkgray-500 mb-2 block h-9 rounded-md border border-gray-300 py-2 px-3 text-sm placeholder:text-gray-400 hover:border-gray-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1 disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:border-gray-300",
        // Renders additional styles when field is wrapped in InputField, which can add addon fields.
        !isStandaloneField &&
          "[&:not(:only-child):first-child]:border-r-0 [&:not(:only-child):last-child]:border-l-0",
        isFullWidth && "w-full",
        props.className
      )}
    />
  );
});

export function InputLeading(props: JSX.IntrinsicElements["div"]) {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-l-sm border border-gray-300 bg-gray-50 px-3 text-gray-500 ltr:border-r-0 rtl:border-l-0 sm:text-sm">
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
  inputIsFullWidth?: boolean;
  addOnFilled?: boolean;
  addOnClassname?: string;
  error?: string;
  labelSrOnly?: boolean;
  containerClassName?: string;
  t?: (key: string) => string;
} & React.ComponentProps<typeof Input> & {
    labelProps?: React.ComponentProps<typeof Label>;
    labelClassName?: string;
  };

type AddonProps = {
  children: React.ReactNode;
  isFilled?: boolean;
  className?: string;
  error?: boolean;
};

const Addon = ({ isFilled, children, className, error }: AddonProps) => (
  <div
    className={classNames(
      "addon-wrapper dark:border-darkgray-500 relative z-10 h-9 border border-gray-300 px-3",
      isFilled && "dark:bg-darkgray-100 dark:text-darkgray-600 dark:bg-darkgray-100 bg-gray-50",
      !isFilled && "border-l-0",
      className
    )}>
    <div className={classNames("flex h-full flex-col justify-center text-sm", error && "text-red-900")}>
      <span className="whitespace-nowrap py-2.5">{children}</span>
    </div>
  </div>
);

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(props, ref) {
  const id = useId();
  const { t: _t, isLocaleReady, i18n } = useLocale();
  const t = props.t || _t;
  const name = props.name || "";
  const {
    label = t(name),
    labelProps,
    labelClassName,
    placeholder = isLocaleReady && i18n.exists(name + "_placeholder") ? t(name + "_placeholder") : "",
    className,
    addOnLeading,
    addOnSuffix,
    addOnFilled = true,
    addOnClassname,
    inputIsFullWidth,
    hint,
    type,
    hintErrors,
    labelSrOnly,
    containerClassName,
    readOnly,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    t: __t,
    ...passThrough
  } = props;

  const [inputValue, setInputValue] = useState<string>("");

  return (
    <div className={classNames(containerClassName)}>
      {!!name && (
        <Skeleton
          as={Label}
          htmlFor={id}
          loadingClassName="w-16"
          {...labelProps}
          className={classNames(labelClassName, labelSrOnly && "sr-only", props.error && "text-red-900")}>
          {label}
        </Skeleton>
      )}
      {addOnLeading || addOnSuffix ? (
        <div className="dark:[&_.addon-wrapper]:focus-within:border-darkgray-500 dark:[&_.addon-wrapper]:hover:border-darkgray-300 group relative mb-1 flex items-center rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-800 focus-within:ring-offset-1 [&_.addon-wrapper]:focus-within:border-neutral-800 [&_.addon-wrapper]:hover:border-gray-400">
          {addOnLeading && (
            <Addon
              isFilled={addOnFilled}
              className={classNames("ltr:rounded-l-md rtl:rounded-r-md", addOnClassname)}>
              {addOnLeading}
            </Addon>
          )}
          <Input
            id={id}
            type={type}
            placeholder={placeholder}
            isFullWidth={inputIsFullWidth}
            isStandaloneField={false}
            className={classNames(
              className,
              addOnLeading && "ltr:rounded-l-none rtl:rounded-r-none",
              addOnSuffix && "ltr:rounded-r-none rtl:rounded-l-none",
              type === "search" && "pr-8",
              "!my-0 !ring-0"
            )}
            {...passThrough}
            {...(type == "search" && {
              onChange: (e) => {
                setInputValue(e.target.value);
                props.onChange && props.onChange(e);
              },
              value: inputValue,
            })}
            readOnly={readOnly}
            ref={ref}
          />
          {addOnSuffix && (
            <Addon
              isFilled={addOnFilled}
              className={classNames("ltr:rounded-r-md rtl:rounded-l-md", addOnClassname)}>
              {addOnSuffix}
            </Addon>
          )}
          {type === "search" && inputValue?.toString().length > 0 && (
            <FiX
              className="absolute top-2.5 h-4 w-4 cursor-pointer text-gray-500 ltr:right-2 rtl:left-2"
              onClick={(e) => {
                setInputValue("");
                props.onChange && props.onChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
              }}
            />
          )}
        </div>
      ) : (
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          className={className}
          {...passThrough}
          readOnly={readOnly}
          ref={ref}
          isFullWidth={inputIsFullWidth}
        />
      )}
      <HintsOrErrors hintErrors={hintErrors} fieldName={name} t={t} />
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
  const { t } = useLocale();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const toggleIsPasswordVisible = useCallback(
    () => setIsPasswordVisible(!isPasswordVisible),
    [isPasswordVisible, setIsPasswordVisible]
  );
  const textLabel = isPasswordVisible ? t("hide_password") : t("show_password");

  return (
    <div>
      <InputField
        type={isPasswordVisible ? "text" : "password"}
        placeholder={props.placeholder || "•••••••••••••"}
        ref={ref}
        {...props}
        className={classNames("mb-0", props.className)}
        addOnFilled={false}
        addOnSuffix={
          <Tooltip content={textLabel}>
            <button className="h-9 text-gray-900" type="button" onClick={() => toggleIsPasswordVisible()}>
              {isPasswordVisible ? (
                <FiEyeOff className="h-4 stroke-[2.5px]" />
              ) : (
                <FiEye className="h-4 stroke-[2.5px]" />
              )}
              <span className="sr-only">{textLabel}</span>
            </button>
          </Tooltip>
        }
      />
    </div>
  );
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

type TextAreaProps = JSX.IntrinsicElements["textarea"];

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaInput(props, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={classNames(
        "dark:text-darkgray-900 dark:border-darkgray-500 dark:bg-darkgray-100 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm hover:border-gray-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1",
        props.className
      )}
    />
  );
});

type TextAreaFieldProps = {
  label?: ReactNode;
  t?: (key: string) => string;
} & React.ComponentProps<typeof TextArea> & {
    name: string;
    labelProps?: React.ComponentProps<typeof Label>;
  };

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextField(
  props,
  ref
) {
  const id = useId();
  const { t: _t } = useLocale();
  const t = props.t || _t;
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
      {methods?.formState?.errors[props.name]?.message && (
        <Alert
          className="mt-1"
          severity="error"
          message={<>{methods.formState.errors[props.name]?.message}</>}
        />
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
          event.stopPropagation();
          form
            .handleSubmit(handleSubmit)(event)
            .catch((err) => {
              // FIXME: Booking Pages don't have toast, so this error is never shown
              showToast(`${getErrorFromUnknown(err).message}`, "error");
            });
        }}
        {...passThrough}>
        {props.children}
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

export const InputFieldWithSelect = forwardRef<
  HTMLInputElement,
  InputFieldProps & { selectProps: typeof UnstyledSelect }
>(function EmailField(props, ref) {
  return (
    <InputField
      ref={ref}
      {...props}
      inputIsFullWidth={false}
      addOnClassname="!px-0"
      addOnSuffix={<UnstyledSelect {...props.selectProps} />}
    />
  );
});
