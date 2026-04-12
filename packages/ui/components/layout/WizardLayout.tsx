"use client";

import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../../components/button/Button";
import { StepCard } from "../../components/card/StepCard";
import { Steps } from "../../components/form/step/Steps";
import { SkeletonText } from "../../components/skeleton/Skeleton";

export function WizardLayout({
  children,
  maxSteps = 2,
  currentStep = 0,
  isOptionalCallback,
  footer,
}: {
  children: React.ReactNode;
} & { maxSteps?: number; currentStep?: number; isOptionalCallback?: () => void; footer?: React.ReactNode }) {
  const { t, isLocaleReady } = useLocale();
  const [meta, setMeta] = useState({ title: "", subtitle: " " });
  const pathname = usePathname();
  const { title, subtitle } = meta;

  useEffect(() => {
    setMeta({
      title: window.document.title,
      subtitle: window.document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    });
  }, [pathname]);

  return (
    <div className="bg-default text-emphasis min-h-screen" data-testid="onboarding">
      <div>
        <Toaster position="bottom-right" />
      </div>
      <div className="mx-auto px-4 py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
            <div className="mx-auto sm:max-w-[520px]">
              <header>
                {isLocaleReady ? (
                  <>
                    <p className="font-cal mb-3 text-[28px] font-medium leading-7">
                      {title.replace(` | ${APP_NAME}`, "")}&nbsp;
                    </p>
                    <p className="text-subtle font-sans text-sm font-normal">{subtitle}&nbsp;</p>
                  </>
                ) : (
                  <>
                    <SkeletonText className="h-6 w-1/2" />
                    <SkeletonText className="mt-4 h-4 w-3/4" />
                  </>
                )}
              </header>
              <Steps maxSteps={maxSteps} currentStep={currentStep} disableNavigation />
            </div>
            <StepCard>{children}</StepCard>
            {footer && <div className="mt-4">{footer}</div>}
          </div>
        </div>
        {isOptionalCallback && (
          <div className="mt-4 flex justify-center">
            <Button data-testid="handle-later-button" color="minimal" onClick={isOptionalCallback}>
              {t("ill_do_this_later")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export const getLayout = (page: React.ReactElement) => <WizardLayout>{page}</WizardLayout>;
