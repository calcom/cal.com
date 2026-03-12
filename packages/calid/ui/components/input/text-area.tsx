"use client";

import { cn } from "@calid/features/lib/cn";
import { cva } from "class-variance-authority";
import { Alert } from "@calid/features/ui/components/alert";
import { Label } from "@calid/features/ui/components/label";
import React from "react";
import { forwardRef } from "react";
import { useId } from "react";
import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";

const textAreaStyles = cva(
  [
    "min-h-[80px] w-full rounded-md border text-sm",
    "placeholder:text-muted",
    "placeholder:text-sm",
    "transition",
  ],
  {
    variants: {
      size: {
        md: "px-3 py-2",
      },
      variant: {
        default: "bg-default border-default text-default",
        underline: [
          "bg-transparent border-0 border-b border-brand-default rounded-none px-0",
          "shadow-none focus:shadow-none focus:ring-0",
          "placeholder:text-muted-foreground",
          "disabled:bg-transparent disabled:text-muted-foreground",
          "h-auto min-h-[48px] resize-none pt-1 pb-1",
        ],
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

type TextAreaProps = JSX.IntrinsicElements["textarea"] & {
  variant?: "default" | "underline";
  size?: "md";
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaInput(
  { variant = "default", size = "md", className, ...props },
  ref
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cn(textAreaStyles({ variant, size }), className)}
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
