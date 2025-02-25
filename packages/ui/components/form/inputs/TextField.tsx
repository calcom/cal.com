"use client";

import { cva } from "class-variance-authority";
import React, { forwardRef, useId, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../../icon";
import { HintsOrErrors } from "./HintOrErrors";
import { Label } from "./Label";
import type { InputFieldProps, InputProps } from "./types";

export const inputStyles = cva(
  [
    // Base styles
    "rounded-[10px] border",
    "leading-none font-normal",

    // Colors
    "bg-default",
    "border-default",
    "text-default",
    "placeholder:text-muted",

    // States
    "hover:border-emphasis",
    "focus:ring-0",
    "focus:shadow-outline-gray-focused",

    // Disabled state
    "disabled:bg-subtle",
    "disabled:hover:border-default",
    "disabled:cursor-not-allowed",

    // Shadow
    "shadow-outline-gray-rested",

    // Transitions
    "transition",
  ],
  {
    variants: {
      size: {
        sm: "h-7 px-2 py-1 text-xs",
        md: "h-8 px-3 py-2 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { isFullWidth = true, size = "md", className, ...props },
  ref
) {
  return (
    <input
      {...props}
      ref={ref}
      className={classNames(inputStyles({ size }), isFullWidth && "w-full", className)}
    />
  );
});

type AddonProps = {
  children: React.ReactNode;
  className?: string;
  error?: boolean;
  onClickAddon?: () => void;
  size?: "sm" | "md";
  position?: "start" | "end";
};

const Addon = ({ children, className, error, onClickAddon, size = "md", position = "start" }: AddonProps) => (
  <div
    onClick={onClickAddon && onClickAddon}
    className={classNames(
      "flex flex-shrink-0 items-center justify-center whitespace-nowrap",
      onClickAddon && "pointer-events-auto cursor-pointer disabled:hover:cursor-not-allowed",
      className
    )}>
    <span
      className={classNames(
        "text-sm font-medium leading-none",
        error ? "text-error" : "text-muted peer-disabled:opacity-50"
      )}>
      {children}
    </span>
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
    disabled,
    LockedIcon,
    placeholder = isLocaleReady && i18n.exists(`${name}_placeholder`) ? t(`${name}_placeholder`) : "",
    className,
    addOnLeading,
    addOnSuffix,
    addOnClassname,
    inputIsFullWidth,
    hint,
    type,
    hintErrors,
    labelSrOnly,
    noLabel,
    containerClassName,
    readOnly,
    showAsteriskIndicator,
    onClickAddon,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    t: __t,
    dataTestid,
    size,
    ...passThrough
  } = props;

  const [inputValue, setInputValue] = useState<string>("");

  return (
    <div className={classNames(containerClassName)}>
      {!!name && !noLabel && (
        <Label
          htmlFor={id}
          {...labelProps}
          className={classNames(labelClassName, labelSrOnly && "sr-only", props.error && "text-error")}>
          {label}
          {showAsteriskIndicator && !readOnly && passThrough.required ? (
            <span className="text-default ml-1 font-medium">*</span>
          ) : null}
          {LockedIcon}
        </Label>
      )}
      {addOnLeading || addOnSuffix ? (
        <div
          dir="ltr"
          className={classNames(
            inputStyles({ size }),
            "group relative mb-1 flex min-w-0 items-center gap-1",
            "[&:focus-within]:border-subtle [&:focus-within]:ring-brand-default [&:focus-within]:ring-2",
            "[&:has(:disabled)]:bg-subtle [&:has(:disabled)]:hover:border-default [&:has(:disabled)]:cursor-not-allowed",
            inputIsFullWidth && "w-full"
          )}>
          {addOnLeading && (
            <Addon size={size ?? "md"} position="start" className={classNames(addOnClassname)}>
              {addOnLeading}
            </Addon>
          )}
          <input
            data-testid={dataTestid ? `${dataTestid}-input` : "input-field"}
            id={id}
            type={type}
            placeholder={placeholder}
            className={classNames(
              "w-full min-w-0 truncate border-0 bg-transparent focus:outline-none focus:ring-0",
              "text-default rounded-lg text-sm font-medium leading-none",
              "placeholder:text-muted disabled:cursor-not-allowed disabled:bg-transparent",
              addOnLeading && "pl-0.5 pr-0",
              addOnSuffix && "pl-0",
              className
            )}
            {...passThrough}
            {...(type == "search" && {
              onChange: (e) => {
                setInputValue(e.target.value);
                props.onChange && props.onChange(e);
              },
              value: inputValue,
            })}
            disabled={readOnly || disabled}
            ref={ref}
          />
          {addOnSuffix && (
            <Addon
              size={size ?? "md"}
              position="end"
              onClickAddon={onClickAddon}
              className={classNames(addOnClassname)}>
              {addOnSuffix}
            </Addon>
          )}
          {type === "search" && inputValue?.toString().length > 0 && (
            <Icon
              name="x"
              className="text-subtle absolute top-2.5 h-4 w-4 cursor-pointer ltr:right-2 rtl:left-2"
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
          size={size}
          className={classNames(
            className,
            "disabled:bg-subtle disabled:hover:border-subtle disabled:cursor-not-allowed"
          )}
          {...passThrough}
          readOnly={readOnly}
          ref={ref}
          isFullWidth={inputIsFullWidth}
          disabled={readOnly || disabled}
        />
      )}
      <HintsOrErrors hintErrors={hintErrors} fieldName={name} t={t} />
      {hint && <div className="text-default mt-2 flex items-center text-sm">{hint}</div>}
    </div>
  );
});

export const TextField = forwardRef<HTMLInputElement, InputFieldProps>(function TextField(props, ref) {
  return <InputField ref={ref} {...props} />;
});
