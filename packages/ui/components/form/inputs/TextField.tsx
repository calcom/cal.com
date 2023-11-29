import React, { forwardRef, useId, useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Skeleton } from "../../..";
import { X } from "../../icon";
import { HintsOrErrors } from "./HintOrErrors";
import { Label } from "./Label";
import type { InputFieldProps, InputProps } from "./types";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { isFullWidth = true, ...props },
  ref
) {
  return (
    <input
      {...props}
      ref={ref}
      className={classNames(
        "hover:border-emphasis dark:focus:border-emphasis border-default bg-default placeholder:text-muted text-emphasis disabled:hover:border-default disabled:bg-subtle focus:ring-brand-default mb-2 block h-9 rounded-md border px-3 py-2 text-sm leading-4 transition focus:border-neutral-300 focus:outline-none focus:ring-2 disabled:cursor-not-allowed",
        isFullWidth && "w-full",
        props.className
      )}
    />
  );
});

type AddonProps = {
  children: React.ReactNode;
  isFilled?: boolean;
  className?: string;
  error?: boolean;
  onClickAddon?: () => void;
};

const Addon = ({ isFilled, children, className, error, onClickAddon }: AddonProps) => (
  <div
    onClick={onClickAddon && onClickAddon}
    className={classNames(
      "addon-wrapper border-default [input:hover_+_&]:border-emphasis [input:hover_+_&]:border-l-default [&:has(+_input:hover)]:border-emphasis [&:has(+_input:hover)]:border-r-default h-9 border px-3",
      isFilled && "bg-subtle",
      onClickAddon && "cursor-pointer disabled:hover:cursor-not-allowed",
      className
    )}>
    <div
      className={classNames(
        "min-h-9 flex flex-col justify-center text-sm leading-7",
        error ? "text-error" : "text-default"
      )}>
      <span className="flex whitespace-nowrap">{children}</span>
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
    addOnFilled = true,
    addOnClassname,
    inputIsFullWidth,
    hint,
    type,
    hintErrors,
    labelSrOnly,
    containerClassName,
    readOnly,
    showAsteriskIndicator,
    onClickAddon,
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
          className="focus-within:ring-brand-default group relative mb-1 flex items-center rounded-md focus-within:outline-none focus-within:ring-2">
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
              onClickAddon={onClickAddon}
              isFilled={addOnFilled}
              className={classNames("ltr:rounded-r-md rtl:rounded-l-md", addOnClassname)}>
              {addOnSuffix}
            </Addon>
          )}
          {type === "search" && inputValue?.toString().length > 0 && (
            <X
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
