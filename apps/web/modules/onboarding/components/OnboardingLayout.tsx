"use client";

import { useOnMount } from "@calcom/lib/hooks/use-on-mount";
import { useLocale } from "@calcom/i18n/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Logo } from "@calcom/ui/components/logo";
import classNames from "classnames";
import { signOut } from "next-auth/react";
import { Children, type ReactNode, useState } from "react";
import { Toaster } from "sonner";

type OnboardingLayoutProps = {
  userEmail: string;
  currentStep?: number;
  totalSteps?: number;
  children: ReactNode;
};

export const OnboardingLayout = ({ userEmail, currentStep, totalSteps, children }: OnboardingLayoutProps) => {
  const { t } = useLocale();
  const [isEmbed, setIsEmbed] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("onboardingEmbed") === "true";
    }
    return false;
  });

  useOnMount(() => {
    setIsEmbed(new URLSearchParams(window.location.search).get("onboardingEmbed") === "true");
  });

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/logout" });
  };

  // Extract children as array
  const childrenArray = Children.toArray(children);
  const column1 = childrenArray[0];
  const column2 = childrenArray[1];

  return (
    <div
      className={classNames(
        "flex min-h-screen w-full flex-col items-center justify-between overflow-clip rounded-[12px] px-4 py-2 md:px-6",
        isEmbed ? "bg-default text-emphasis" : "bg-cal-muted"
      )}>
      {/* Logo and container - centered */}
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
        {!isEmbed && <Logo className="mt-4 h-5 w-auto shrink-0" />}
        <div
          className={classNames(
            "grid min-h-0 w-full flex-1 grid-cols-1 gap-12 overflow-hidden px-4 py-2 sm:px-12 sm:py-10 xl:grid-cols-[40%_1fr] xl:pl-10 xl:pr-0",
            isEmbed
              ? "max-w-[532px] xl:max-w-[1130px]"
              : "border-subtle bg-default max-h-[690px] max-w-[532px] rounded-2xl border xl:h-[690px] xl:max-w-[1130px]"
          )}>
          {/* Column 1 - Always visible, 40% on xl+ */}
          <div className="flex h-full min-h-0 flex-col">{column1}</div>
          {/* Column 2 - Hidden on mobile, visible on xl+, 60% on xl+ */}
          {column2 && (
            <div className="hidden h-full max-h-full min-h-0 flex-col overflow-hidden xl:flex">{column2}</div>
          )}
        </div>
      </div>

      {/* Footer with progress dots and sign out */}
      {!isEmbed && (
        <div className="flex w-full flex-col items-center justify-center gap-2 sm:gap-4 px-10 pt-2 pb-4 sm:py-8">
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
          <Button onClick={handleSignOut} color="minimal" className="text-subtle h-7">
            {t("sign_out")}
          </Button>
        </div>
      )}
      <Toaster position="bottom-right" />
    </div>
  );
};
