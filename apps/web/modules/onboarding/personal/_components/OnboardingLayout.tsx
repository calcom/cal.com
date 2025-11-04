"use client";

import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";

type OnboardingLayoutProps = {
  userEmail: string;
  currentStep: 1 | 2 | 3 | 4;
  children: ReactNode;
};

export const OnboardingLayout = ({ userEmail, currentStep, children }: OnboardingLayoutProps) => {
  const { t } = useLocale();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/logout" });
  };

  return (
    <div className="bg-muted flex min-h-screen w-full flex-col items-start overflow-clip rounded-[12px]">
      {/* Header */}
      <div className="3xl:max-w-[2000px] 4xl:max-w-[2400px] mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6 lg:max-w-[1400px] lg:px-[176px] xl:max-w-[1600px] 2xl:max-w-[1800px]">
        <Logo className="h-5 w-auto" />
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <p className="text-default text-sm font-medium leading-none">{userEmail}</p>
          </div>
          <div className="relative h-[5px] w-[5px] shrink-0">
            <Icon name="dot" className="text-muted h-[5px] w-[5px]" />
          </div>
          <Button onClick={handleSignOut} color="minimal" className="text-subtle h-7">
            {t("sign_out")}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto flex w-full flex-1 items-center justify-center px-6 py-10">
        <div className="bg-default border-subtle h-full max-h-[690px] overflow-hidden rounded-2xl border px-14 py-10">
          <div className="grid h-full grid-cols-1 items-stretch gap-6 xl:grid-cols-[40%_60%] [&>*:nth-child(2)]:hidden xl:[&>*:nth-child(2)]:block">
            {children}
          </div>
        </div>
      </div>

      {/* Footer with progress dots */}
      <div className="flex w-full items-center justify-center px-10 py-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="relative flex h-2 w-2 shrink-0 items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full ${
                  step <= currentStep ? "bg-emphasis" : "bg-muted"
                }`}
              />
              {step <= currentStep && <div className="bg-emphasis absolute h-1 w-1 rounded-full" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
