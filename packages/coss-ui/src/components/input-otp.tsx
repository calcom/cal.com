"use client";

import { Separator } from "@coss/ui/components/separator";
import { cn } from "@coss/ui/lib/utils";
import { OTPInput, OTPInputContext } from "input-otp";
import type * as React from "react";
import { useContext } from "react";

type InputOTPSize = "default" | "lg";
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type InputOTPProps = DistributiveOmit<React.ComponentProps<typeof OTPInput>, "size" | "data-size"> & {
  containerClassName?: string;
};

export function InputOTP({ className, containerClassName, ...props }: InputOTPProps): React.ReactElement {
  return (
    <OTPInput
      className={className}
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-64 has-disabled:**:data-[slot=input-otp-slot]:shadow-none has-disabled:**:data-[slot=input-otp-slot]:before:shadow-none!",
        containerClassName
      )}
      data-slot="input-otp"
      spellCheck={false}
      {...props}
    />
  );
}

export function InputOTPGroup({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: InputOTPSize;
}): React.ReactElement {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-size={size}
      data-slot="input-otp-group"
      {...props}
    />
  );
}

export function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}): React.ReactElement {
  const inputOTPContext = useContext(OTPInputContext);
  const slot = inputOTPContext?.slots[index];
  const { char, hasFakeCaret, isActive } = slot ?? {};

  return (
    <div
      className={cn(
        "relative inline-flex in-[[data-slot=input-otp-group][data-size=lg]]:size-10 size-9 items-center justify-center rounded-lg border border-input bg-background not-dark:bg-clip-padding in-[[data-slot=input-otp-group][data-size=lg]]:text-lg text-base text-foreground shadow-xs/5 outline-none ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-data-[active=true]:not-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] aria-invalid:border-destructive/36 data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-[3px] data-[active=true]:ring-ring/24 data-[active=true]:aria-invalid:border-destructive/64 data-[active=true]:aria-invalid:ring-destructive/16 sm:in-[[data-slot=input-otp-group][data-size=lg]]:size-9 sm:size-8 sm:in-[[data-slot=input-otp-group][data-size=lg]]:text-base sm:text-sm dark:bg-input/32 dark:data-[active=true]:aria-invalid:ring-destructive/24 dark:not-data-[active=true]:not-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)] [[data-active=true],[aria-invalid]]:shadow-none",
        className
      )}
      data-active={isActive ? true : undefined}
      data-slot="input-otp-slot"
      {...props}>
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground" />
        </div>
      )}
    </div>
  );
}

export function InputOTPSeparator({
  className,
  ref: _ref,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <Separator
      className={cn(
        "rounded-full bg-input data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:w-3",
        className
      )}
      {...props}
    />
  );
}

export { OTPInput as InputOTPPrimitive };
