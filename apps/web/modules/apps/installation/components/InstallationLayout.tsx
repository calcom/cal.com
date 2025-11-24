"use client";

import classNames from "classnames";
import { type ReactNode } from "react";

import { Logo } from "@calcom/ui/components/logo";

type InstallationLayoutProps = {
  userEmail: string;
  currentStep?: number;
  totalSteps?: number;
  children: ReactNode;
  useFitHeight?: boolean;
};

export const InstallationLayout = ({
  userEmail,
  currentStep,
  totalSteps,
  children,
  useFitHeight = false,
}: InstallationLayoutProps) => {
  return (
    <div className="bg-muted flex min-h-screen w-full flex-col items-center justify-between overflow-clip rounded-[12px] px-4 py-2 md:px-6">
      {/* Logo and container - centered */}
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
        <Logo className="mt-4 h-5 w-auto shrink-0" />
        <div
          className={classNames(
            "border-subtle bg-default w-full max-w-[532px] rounded-2xl border px-4 py-2 transition-all duration-500 ease-in-out sm:px-12 sm:py-10",
            {
              "h-fit max-h-[690px]": useFitHeight,
              "max-h-[690px] min-h-0 flex-1 overflow-hidden xl:h-[690px]": !useFitHeight,
            }
          )}>
          {/* Single column - always visible */}
          <div className={classNames("flex w-full flex-col", { "h-fit": useFitHeight, "h-full min-h-0": !useFitHeight })}>
            {children}
          </div>
        </div>
      </div>

      {/* Footer with progress dots */}
      <div className="flex w-full flex-col items-center justify-center gap-4 px-10 py-8">
        <div className="flex min-h-[6px] items-center gap-1">
          {totalSteps && totalSteps > 0 ? (
            Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
              const isCurrent = step === currentStep;
              const isPast = currentStep !== undefined && step < currentStep;
              const isUpcoming = currentStep !== undefined && step > currentStep;

              return (
                <div
                  key={step}
                  className={classNames("shrink-0 rounded-full transition-all", {
                    "h-[6px] w-[6px] bg-[var(--cal-text)]": isCurrent,
                    "h-[4px] w-[4px] bg-[var(--cal-text-subtle)]": isPast,
                    "h-[4px] w-[4px] bg-[var(--cal-text-muted)] opacity-50": isUpcoming,
                  })}
                  aria-label={`Step ${step} of ${totalSteps}`}
                />
              );
            })
          ) : (
            <div className="h-[6px]" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
};

