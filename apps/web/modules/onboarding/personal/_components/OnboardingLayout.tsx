"use client";

import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
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
    <div className="bg-muted flex min-h-screen w-full flex-col items-center justify-between overflow-clip rounded-[12px] px-6 py-10">
      {/* Logo and container - centered */}
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-8">
        <Logo className="h-5 w-auto shrink-0" />
        <div className="border-subtle bg-default grid w-full max-w-[564px] grid-cols-1 gap-6 rounded-2xl border px-12 py-10 xl:max-w-[1130px] xl:grid-cols-2 [&>*:nth-child(2)]:hidden xl:[&>*:nth-child(2)]:flex [&>*]:flex [&>*]:h-full [&>*]:max-h-[690px] [&>*]:w-full [&>*]:max-w-[564px] [&>*]:flex-col">
          {children}
        </div>
      </div>

      {/* Footer with progress dots and sign out */}
      <div className="flex w-full flex-col items-center justify-center gap-4 px-10 py-8">
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
        <Button onClick={handleSignOut} color="minimal" className="text-subtle h-7">
          {t("sign_out")}
        </Button>
      </div>
    </div>
  );
};
