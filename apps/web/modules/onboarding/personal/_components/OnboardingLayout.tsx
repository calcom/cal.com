import type { ReactNode } from "react";

import { Logo } from "@calcom/ui/components/logo";

type OnboardingLayoutProps = {
  userEmail: string;
  currentStep: 1 | 2 | 3 | 4;
  children: ReactNode;
};

export const OnboardingLayout = ({ userEmail, currentStep, children }: OnboardingLayoutProps) => {
  return (
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`bg-${step <= currentStep ? "emphasis" : "subtle"} ${
                step === currentStep ? "h-1.5 w-1.5" : "h-1 w-1"
              } rounded-full`}
            />
          ))}
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-4">{children}</div>
      </div>
    </div>
  );
};
