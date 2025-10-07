"use client";

import type { TextFieldProps } from "@calid/features/ui/components/input/types";
import type { ReactNode } from "react";
import React, { forwardRef, useCallback, useId, useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

import { Alert } from "../../alert";
import { Icon } from "../../icon";
import { Tooltip } from "../../tooltip";
import { Input, TextField } from "../inputs/TextField";
import { Label } from "./Label";

export function InputLeading(props: JSX.IntrinsicElements["div"]) {
  return (
    <span className="bg-muted border-default text-subtle inline-flex flex-shrink-0 items-center rounded-l-sm border px-3 sm:text-sm sm:leading-4 ltr:border-r-0 rtl:border-l-0">
      {props.children}
    </span>
  );
}

type PasswordFieldTranslations = {
  showPasswordText?: string;
  hidePasswordText?: string;
};

export const PasswordField = forwardRef<HTMLInputElement, TextFieldProps>(function PasswordField(props, ref) {
  const { t } = useLocale();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const toggleIsPasswordVisible = useCallback(
    () => setIsPasswordVisible(!isPasswordVisible),
    [isPasswordVisible, setIsPasswordVisible]
  );
  const textLabel = isPasswordVisible ? t("hide_password") : t("show_password");

  return (
    <TextField
      type={isPasswordVisible ? "text" : "password"}
      placeholder={props.placeholder || "•••••••••••••"}
      ref={ref}
      {...props}
      className={classNames(
        "addon-wrapper focus-visible:ring-none mb-0 w-full rounded-r-none focus-visible:ring-0 ltr:border-r-0 rtl:border-l-0",
        props.className
      )}
      addOnSuffix={
        <Tooltip content={textLabel}>
          <button
            className="border-subtle text-emphasis rounded-r-md border-y border-r"
            tabIndex={-1}
            type="button"
            onClick={() => toggleIsPasswordVisible()}>
            {isPasswordVisible ? (
              <Icon name="eye-off" className="mr-3 h-4 w-4 stroke-[2.5px]" />
            ) : (
              <Icon name="eye" className="mr-3 h-4 w-4 stroke-[2.5px]" />
            )}
            <span className="sr-only">{textLabel}</span>
          </button>
        </Tooltip>
      }
    />
  );
});

export const EmailInput = forwardRef<HTMLInputElement, TextFieldProps>(function EmailInput(props, ref) {
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

export const EmailField = forwardRef<HTMLInputElement, TextFieldProps>(function EmailField(props, ref) {
  return (
    <TextField
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
    // inputStyles(),
    <textarea
      {...props}
      ref={ref}
      className={classNames("bg-default min-h-[80px] w-full", props.className)}
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
    placeholder = t(`${props.name}_placeholder`) !== `${props.name}_placeholder`
      ? `${props.name}_placeholder`
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

export function FieldsetLegend(props: JSX.IntrinsicElements["legend"]) {
  return (
    <legend {...props} className={classNames("text-default text-sm font-medium leading-4", props.className)}>
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

export const NumberInput = forwardRef<HTMLInputElement, TextFieldProps>(function NumberInput(props, ref) {
  return (
    <Input
      ref={ref}
      type="number"
      autoCapitalize="none"
      autoComplete="numeric"
      autoCorrect="off"
      inputMode="numeric"
      {...props}
    />
  );
});

export const FilterSearchField = forwardRef<HTMLInputElement, TextFieldProps>(function PasswordField(
  props,
  ref
) {
  return (
    <TextField
      ref={ref}
      addOnLeading={<Icon name="search" className="h-4 w-4 stroke-[2.5px]" data-testid="search-icon" />}
      placeholder="Search"
      containerClassName=""
      {...props}
    />
  );
});
