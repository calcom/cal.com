"use client";

import { cva } from "class-variance-authority";
import React, { forwardRef, useId, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../../icon";
import { Skeleton } from "../../skeleton";
import { HintsOrErrors } from "./HintOrErrors";
import { Label } from "./Label";
import type { InputFieldProps, InputProps } from "./types";

export const inputStyles = cva(
  [
    // Base styles
    "block rounded-lg border",
    "leading-none font-normal",

    // Colors
    "bg-default",
    "border-default",
    "text-default",
    "placeholder:text-muted",

    // States
    "hover:border-emphasis",
    "dark:focus:border-emphasis",
    "focus:border-subtle",
    "focus:ring-brand-default",
    "focus:ring-2",
    "focus:outline-none",

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
        sm: "h-7 px-2 py-1 mb-1 text-xs",
        md: "h-9 px-3 py-2 mb-2 text-sm",
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
};

const Addon = ({ children, className, error, onClickAddon, size = "md" }: AddonProps) => (
  <div
    onClick={onClickAddon && onClickAddon}
    className={classNames(
      "addon-wrapper border-default [input:hover_+_&]:border-emphasis [input:hover_+_&]:border-l-default [&:has(+_input:hover)]:border-emphasis [&:has(+_input:hover)]:border-r-default h-9 px-3 transition",
      onClickAddon && "cursor-pointer disabled:hover:cursor-not-allowed",
      className
    )}>
    <div
      className={classNames(
        "min-h-9 flex flex-col justify-center text-sm leading-7",
        error ? "text-error" : "text-default"
      )}>
      <span
        className="flex max-w-2xl overflow-y-auto whitespace-nowrap"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          overflow: "-ms-scroll-chaining",
          msOverflowStyle: "-ms-autohiding-scrollbar",
        }}>
        {children}
      </span>
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
        <Skeleton
          as={Label}
          htmlFor={id}
          loadingClassName="w-16"
          {...labelProps}
          className={classNames(labelClassName, labelSrOnly && "sr-only", props.error && "text-error")}>
          {label}
          {showAsteriskIndicator && !readOnly && passThrough.required ? (
            <span className="text-default ml-1 font-medium">*</span>
          ) : null}
          {LockedIcon}
        </Skeleton>
      )}
      {addOnLeading || addOnSuffix ? (
        <div
          dir="ltr"
          className="focus-within:ring-brand-default group relative mb-1 flex items-center rounded-md transition focus-within:outline-none focus-within:ring-2 ">
          {addOnLeading && (
            <Addon
              size={size ?? "md"}
              className={classNames("ltr:rounded-l-lg rtl:rounded-r-lg", addOnClassname)}>
              {addOnLeading}
            </Addon>
          )}
          <Input
            data-testid={dataTestid ? `${dataTestid}-input` : "input-field"}
            id={id}
            type={type}
            placeholder={placeholder}
            isFullWidth={inputIsFullWidth}
            size={size}
            className={classNames(
              className,
              "disabled:bg-subtle disabled:hover:border-subtle disabled:cursor-not-allowed",
              addOnLeading && "rounded-l-none border-l-0",
              addOnSuffix && "rounded-r-none border-r-0",
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
            disabled={readOnly || disabled}
            ref={ref}
          />
          {addOnSuffix && (
            <Addon
              size={size ?? "md"}
              onClickAddon={onClickAddon}
              className={classNames("ltr:rounded-r-lg rtl:rounded-l-lg", addOnClassname)}>
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
