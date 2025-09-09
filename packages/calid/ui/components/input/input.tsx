"use client";

import { cn } from "@calid/features/lib/cn";
import { cva } from "class-variance-authority";
import React, { forwardRef, useId, useState } from "react";
import { useCallback } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../icon/Icon";
import { Label } from "../label";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../tooltip";
import { HintsOrErrors } from "./hint-or-errors";
import type { InputProps, InputFieldProps } from "./types";

export const inputStyles = cva(
  [
    // Base styles
    "rounded-md border",
    "leading-none font-normal",

    // Colors
    "bg-default",
    "border-default",
    "text-default",
    "placeholder:text-muted",

    // States
    "hover:border-emphasis",
    "focus:ring-0",
    "focus:outline-none",
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
    <input {...props} ref={ref} className={cn(inputStyles({ size }), isFullWidth && "w-full", className)} />
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
    className={cn(
      "flex flex-shrink-0 items-center justify-center whitespace-nowrap",
      onClickAddon && "pointer-events-auto cursor-pointer disabled:hover:cursor-not-allowed",
      className
    )}>
    <span
      className={cn(
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
    <div className={cn(containerClassName)}>
      {!!name && !noLabel && (
        <Label
          htmlFor={id}
          {...labelProps}
          className={cn(labelClassName, labelSrOnly && "sr-only", props.error && "text-error")}>
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
          className={cn(
            inputStyles({ size }),
            "group relative flex min-w-0 items-center gap-1",
            "[&:has(:disabled)]:bg-subtle [&:has(:disabled)]:hover:border-default [&:has(:disabled)]:cursor-not-allowed",
            inputIsFullWidth && "w-full"
          )}>
          {addOnLeading && (
            <Addon size={size ?? "md"} position="start" className={cn(addOnClassname)}>
              {addOnLeading}
            </Addon>
          )}
          <input
            data-testid={dataTestid ? `${dataTestid}-input` : "input-field"}
            id={id}
            type={type}
            placeholder={placeholder}
            className={cn(
              "w-full min-w-0 truncate border-0 bg-transparent focus:outline-none focus:ring-0",
              "text-default rounded-md text-sm font-medium leading-none",
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
              className={cn(addOnClassname)}>
              {addOnSuffix}
            </Addon>
          )}
          {type === "search" && inputValue?.toString().length > 0 && (
            <Icon
              name="x"
              className="text-subtle absolute top-2 h-4 w-4 cursor-pointer ltr:right-2 rtl:left-2"
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
          className={cn(
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
      className={cn(
        "addon-wrapper focus-visible:ring-none mb-0 w-full rounded-r-none focus-visible:ring-0 ltr:border-r-0 rtl:border-l-0",
        props.className
      )}
      addOnSuffix={
        <TooltipProvider>
          <Tooltip content={textLabel}>
            <TooltipTrigger>
              <button className="text-emphasis"
              tabIndex={-1}
              type="button"
              onClick={() => toggleIsPasswordVisible()}>
              {isPasswordVisible ? (
                <Icon name="eye-off" className="h-4 w-4 stroke-[2.5px]" />
              ) : (
                <Icon name="eye" className="h-4 w-4 stroke-[2.5px]" />
              )}
              <span className="sr-only">{textLabel}</span>
            </button>
            </TooltipTrigger>
            <TooltipContent>{textLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
    />
  );
});

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