"use client";

import { cn } from "@calid/features/lib/cn";
import { cva } from "class-variance-authority";
import React, { forwardRef, useId, useState, useMemo, useEffect } from "react";
import { useCallback } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../icon/Icon";
import { Label } from "../label";
import { Tooltip } from "../tooltip";
import { HintsOrErrors } from "./hint-or-errors";
import type { InputProps, InputFieldProps, TextFieldProps } from "./types";

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
      variant: {
        default: "",
        floating: [
          "peer w-full bg-transparent focus:outline-none font-medium",
          "placeholder:opacity-0 focus:placeholder:opacity-100",
          "border-0 focus:ring-0 shadow-none",
        ],
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

// New container styles for floating variant
export const floatingContainerStyles = cva(
  ["relative border rounded-lg bg-default", "transition-all duration-300"],
  {
    variants: {
      state: {
        default: "border-gray-300",
        focused: "border-[#007ee5] shadow-[0_0_0_3.5px_rgba(0,126,229,0.2)]",
        error: "border-red-500 shadow-[0_0_0_3.5px_rgba(239,68,68,0.25)]",
        acceptable: "border-yellow-500 shadow-[0_0_0_3.5px_rgba(245,158,11,0.25)]",
        strong: "border-green-600 shadow-[0_0_0_3.5px_rgba(22,163,74,0.25)]",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

// Floating label styles
export const floatingLabelStyles = cn(
  "absolute text-gray-500 font-medium duration-300 transform pointer-events-none",
  "-translate-y-1/2 scale-100 top-1/2 left-10",
  "peer-focus:scale-75 peer-focus:top-0 peer-focus:left-7 peer-focus:px-1 peer-focus:bg-white dark:peer-focus:bg-[#252525]",
  "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:scale-75",
  "peer-[:not(:placeholder-shown)]:left-7 peer-[:not(:placeholder-shown)]:px-1",
  "peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-[#252525]"
);

export const Input = forwardRef<HTMLInputElement, InputProps & { variant?: "default" | "floating" }>(
  function Input({ isFullWidth = true, size = "md", variant = "default", className, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        className={cn(inputStyles({ size, variant }), isFullWidth && "w-full", className)}
      />
    );
  }
);

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

export const InputField = forwardRef<
  HTMLInputElement,
  InputFieldProps & { variant?: "default" | "floating"; prefixIcon?: string }
>(function InputField(props, ref) {
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
    variant = "default",
    prefixIcon,
    min,
    max,
    onChange,
    onInput,
    value,
    ...passThrough
  } = props;

  const [inputValue, setInputValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);

  // For floating variant
  if (variant === "floating") {
    return (
      <div className={cn(containerClassName)}>
        {!noLabel && !labelSrOnly && label && (
          <Label
            htmlFor={id}
            {...labelProps}
            className={cn(labelClassName, "mb-0", props.error && "text-error")}>
            {label}
            {showAsteriskIndicator && !readOnly && passThrough.required && (
              <span className="text-default ml-1 font-medium">*</span>
            )}
            {LockedIcon}
          </Label>
        )}
        <div
          className={cn(
            floatingContainerStyles({
              state: isFocused ? "focused" : "default",
            })
          )}>
          {prefixIcon && (
            <Icon
              name={prefixIcon as any}
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base",
                "transition-colors duration-300",
                isFocused ? "text-[#007ee5]" : "text-gray-400"
              )}
            />
          )}
          <Input
            data-testid={dataTestid ? `${dataTestid}-input` : "input-field"}
            id={id}
            type={type}
            placeholder=" "
            variant="floating"
            size={size}
            className={cn(
              prefixIcon ? "py-3 pl-10 pr-4" : "px-4 py-3",
              addOnSuffix && "pr-10",
              "text-default bg-default",
              className
            )}
            {...passThrough}
            onChange={(e) => {
              onChange(e);
            }}
            onInput={(e) => {
              onInput(e);
            }}
            disabled={readOnly || disabled}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              passThrough.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              passThrough.onBlur?.(e);
            }}
          />
          <label
            htmlFor={id}
            className={cn(floatingLabelStyles, isFocused && "text-[#007ee5]", props.error && "text-red-500")}>
            {placeholder || label}
          </label>
          {addOnSuffix && (
            <div className="absolute right-0 top-0 flex h-full items-center pr-3">{addOnSuffix}</div>
          )}
        </div>
        {hint && <div className="text-default mt-2 flex items-center text-sm">{hint}</div>}
      </div>
    );
  }

  // Default variant (existing code)
  // Enhanced change handler that enforces min/max for number inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (type === "number" && (min !== undefined || max !== undefined)) {
      const numValue = parseFloat(newValue);

      // Allow empty string for clearing the field
      if (newValue === "") {
        onChange?.(e);
        return;
      }

      // Check if it's a valid number
      if (!isNaN(numValue)) {
        let clampedValue = numValue;

        // Clamp the value between min and max
        if (min !== undefined && numValue < Number(min)) {
          clampedValue = Number(min);
        }
        if (max !== undefined && numValue > Number(max)) {
          clampedValue = Number(max);
        }

        // If the value was clamped, update the event target value
        if (clampedValue !== numValue) {
          e.target.value = String(clampedValue);
        }
      }
    }

    // Call the original onChange handler
    onChange?.(e);
  };

  // Handle blur event to enforce min/max when user leaves the field
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === "number" && (min !== undefined || max !== undefined)) {
      const numValue = parseFloat(e.target.value);

      if (!isNaN(numValue)) {
        let clampedValue = numValue;

        if (min !== undefined && numValue < Number(min)) {
          clampedValue = Number(min);
        }
        if (max !== undefined && numValue > Number(max)) {
          clampedValue = Number(max);
        }

        if (clampedValue !== numValue) {
          // Create a synthetic event with the clamped value
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: String(clampedValue) },
          } as React.ChangeEvent<HTMLInputElement>;

          onChange?.(syntheticEvent);
        }
      }
    }

    // Call original onBlur if it exists
    passThrough.onBlur?.(e);
  };

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
            "group relative flex min-w-0 items-center",
            "[&:focus-within]:border-subtle [&:focus-within]:ring-brand-default [&:focus-within]:ring-2",
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
            min={min}
            max={max}
            className={cn(
              "w-full min-w-0 truncate border-0 bg-transparent focus:outline-none focus:ring-0",
              "text-default rounded-md text-sm font-medium leading-none",
              "placeholder:text-muted disabled:cursor-not-allowed disabled:bg-transparent",
              addOnLeading && "pl-0.5 pr-0",
              addOnSuffix && "pl-0",
              className
            )}
            {...passThrough}
            onChange={onChange}
            value={value}
            {...(type == "search" && {
              onChange: (e) => {
                setInputValue(e.target.value);
                props.onChange && props.onChange(e);
              },
              value: inputValue,
            })}
            {...(type === "number" && {
              onChange: handleChange,
              onBlur: handleBlur,
              value: value,
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
          min={min}
          max={max}
          className={cn(
            className,
            "disabled:bg-subtle disabled:hover:border-subtle focus:ring-brand-default focus:border-none focus:ring-2 disabled:cursor-not-allowed"
          )}
          {...passThrough}
          onChange={type === "number" ? handleChange : onChange}
          onBlur={type === "number" ? handleBlur : passThrough.onBlur}
          value={value}
          readOnly={readOnly}
          ref={ref}
          isFullWidth={inputIsFullWidth}
          disabled={readOnly || disabled}
        />
      )}
      {hint && <div className="text-default mt-2 flex items-center text-sm">{hint}</div>}
    </div>
  );
});

export const TextField = forwardRef<
  HTMLInputElement,
  InputFieldProps & { variant?: "default" | "floating"; prefixIcon?: string }
>(function TextField(props, ref) {
  return <InputField ref={ref} {...props} />;
});

export const EmailField = forwardRef<
  HTMLInputElement,
  TextFieldProps & { variant?: "default" | "floating"; prefixIcon?: string }
>(function EmailField(props, ref) {
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

interface PasswordStrength {
  label: string;
  bars: number;
  textClass: string;
  barClass: string;
  containerState: "default" | "focused" | "error" | "acceptable" | "strong";
}

interface PasswordChecks {
  length: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  noRepeat: boolean;
}

interface PasswordFieldProps extends Omit<TextFieldProps, "type"> {
  showStrengthMeter?: boolean;
  showRequirements?: boolean;
  onPasswordChange?: (value: string, checks: PasswordChecks, strength: PasswordStrength) => void;
  variant?: "default" | "floating";
  prefixIcon?: string;
}

const RequirementItem = ({ check, label }: { check: boolean; label: string }) => {
  return (
    <p
      className={cn(
        "flex items-center text-xs transition-all duration-300",
        check ? "text-green-600" : "text-default"
      )}>
      <Icon
        name={check ? "check" : "circle"}
        size={6}
        className={cn(
          "mr-2 transition-all duration-300",
          check ? "text-green-600" : "fill-color text-gray-400"
        )}
        style={{
          transform: check ? "scale(2.25) rotate(10deg)" : "scale(1)",
          transformOrigin: "center",
          fontSize: check ? "12px" : "6px",
        }}
      />
      {label}
    </p>
  );
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  {
    showStrengthMeter = false,
    showStrengthColors = false,
    showRequirements = false,
    onPasswordChange,
    onChange,
    variant = "default",
    prefixIcon,
    ...props
  },
  ref
) {
  const { t } = useLocale();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const toggleIsPasswordVisible = useCallback(
    () => setIsPasswordVisible(!isPasswordVisible),
    [isPasswordVisible]
  );

  const passwordChecks = useMemo((): PasswordChecks => {
    return {
      length: passwordValue.length >= 8,
      hasLower: /[a-z]/.test(passwordValue),
      hasUpper: /[A-Z]/.test(passwordValue),
      hasNumber: /[0-9]/.test(passwordValue),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordValue),
      noRepeat: true,
    };
  }, [passwordValue]);

  const passwordStrength = useMemo((): PasswordStrength => {
    const checksArray = Object.values(passwordChecks);
    const passedChecks = checksArray.filter(Boolean).length;
    const totalChecks = checksArray.length;

    if (passedChecks === totalChecks) {
      return {
        label: t("strong") || "Strong",
        bars: 3,
        textClass: "text-green-600",
        barClass: "bg-green-500",
        containerState: "strong",
      };
    } else if (passedChecks >= totalChecks * 0.6) {
      return {
        label: t("acceptable") || "Acceptable",
        bars: 2,
        textClass: "text-yellow-600",
        barClass: "bg-yellow-500",
        containerState: "acceptable",
      };
    } else {
      return {
        label: t("too_weak") || "Too weak",
        bars: 1,
        textClass: "text-red-600",
        barClass: "bg-red-500",
        containerState: "error",
      };
    }
  }, [passwordChecks, t]);

  // Notify parent of password changes
  useEffect(() => {
    if (onPasswordChange && passwordValue) {
      onPasswordChange(passwordValue, passwordChecks, passwordStrength);
    }
  }, [passwordValue, passwordChecks, passwordStrength, onPasswordChange]);

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPasswordValue(value);

      if (onChange) {
        onChange(e);
      }
    },
    [onChange]
  );

  const textLabel = isPasswordVisible ? t("hide_password") : t("show_password");

  // Floating variant with custom container
  if (variant === "floating") {
    const containerState =
      passwordValue && showStrengthColors
        ? passwordStrength.containerState
        : isFocused
        ? "focused"
        : "default";

    return (
      <div className="w-full">
        <div className={cn(floatingContainerStyles({ state: containerState }))}>
          {prefixIcon && (
            <Icon
              name={prefixIcon as any}
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base",
                "transition-colors duration-300",
                passwordValue && showStrengthColors
                  ? passwordStrength.containerState === "strong"
                    ? "text-green-600"
                    : passwordStrength.containerState === "acceptable"
                    ? "text-yellow-500"
                    : "text-red-500"
                  : isFocused
                  ? "text-[#007ee5]"
                  : "text-gray-400"
              )}
            />
          )}
          <Input
            type={isPasswordVisible ? "text" : "password"}
            placeholder=" "
            variant="floating"
            ref={ref}
            {...props}
            onChange={handlePasswordChange}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              prefixIcon ? "py-3 pl-10 pr-10" : "px-4 py-3 pr-10",
              "bg-default text-default font-medium",
              props.className
            )}
          />
          <label
            htmlFor={props.id}
            className={cn(
              floatingLabelStyles,
              passwordValue && showStrengthColors
                ? passwordStrength.containerState === "strong"
                  ? "text-green-600"
                  : passwordStrength.containerState === "acceptable"
                  ? "text-yellow-500"
                  : "text-red-500"
                : isFocused
                ? "text-[#007ee5]"
                : "text-gray-500"
            )}>
            {props.placeholder || props.label || "Password"}
          </label>
          <button
            type="button"
            onClick={toggleIsPasswordVisible}
            className="absolute right-0 top-0 flex h-full items-center pr-3 text-gray-500 hover:text-gray-400 focus:outline-none">
            <Icon name={isPasswordVisible ? "eye-off" : "eye"} className="h-4 w-4" />
          </button>
        </div>

        {showStrengthMeter && passwordValue && (
          <div className="mt-2 flex items-center justify-between px-1">
            <span
              className={cn(
                "text-sm font-semibold transition-colors duration-300",
                passwordStrength.textClass
              )}>
              {passwordStrength.label}
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 w-10 rounded-full transition-colors duration-300",
                    index < passwordStrength.bars ? passwordStrength.barClass : "bg-gray-200"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {showRequirements && (
          <div className="mt-2 space-y-1">
            <RequirementItem check={passwordChecks.length} label="At least 8 characters" />
            <RequirementItem
              check={passwordChecks.hasLower && passwordChecks.hasUpper}
              label="Mix of uppercase & lowercase"
            />
            <RequirementItem check={passwordChecks.hasNumber} label="At least one number" />
            <RequirementItem check={passwordChecks.hasSpecial} label="At least one special character" />
          </div>
        )}
      </div>
    );
  }

  // Default variant (existing behavior)
  return (
    <div className="w-full">
      <TextField
        type={isPasswordVisible ? "text" : "password"}
        placeholder={props.placeholder || "•••••••••••••"}
        ref={ref}
        {...props}
        onChange={handlePasswordChange}
        className={cn(
          "addon-wrapper focus-visible:ring-none mb-0 w-full rounded-r-none focus-visible:ring-0 ltr:border-r-0 rtl:border-l-0",
          props.className
        )}
        addOnSuffix={
          <Tooltip content={textLabel}>
            <button className="text-emphasis" tabIndex={-1} type="button" onClick={toggleIsPasswordVisible}>
              {isPasswordVisible ? (
                <Icon name="eye-off" className="h-4 w-4 stroke-[2.5px]" />
              ) : (
                <Icon name="eye" className="h-4 w-4 stroke-[2.5px]" />
              )}
              <span className="sr-only">{textLabel}</span>
            </button>
          </Tooltip>
        }
      />

      {showStrengthMeter && passwordValue && (
        <div className="mt-2 flex items-center justify-between px-1">
          <span
            className={cn(
              "text-sm font-semibold transition-colors duration-300",
              passwordStrength.textClass
            )}>
            {passwordStrength.label}
          </span>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 w-10 rounded-full transition-colors duration-300",
                  index < passwordStrength.bars ? passwordStrength.barClass : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {showRequirements && (
        <div className="mt-2 space-y-1">
          <RequirementItem check={passwordChecks.length} label="At least 8 characters" />
          <RequirementItem
            check={passwordChecks.hasLower && passwordChecks.hasUpper}
            label="Mix of uppercase & lowercase"
          />
          <RequirementItem check={passwordChecks.hasNumber} label="At least one number" />
          <RequirementItem check={passwordChecks.hasSpecial} label="At least one special character" />
        </div>
      )}
    </div>
  );
});
