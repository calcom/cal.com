"use client";

import { noop } from "lodash";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Steps } from "@calcom/ui/components/form";
import { SkeletonText } from "@calcom/ui/components/skeleton";

import { Button } from "../button";
import { StepCard } from "../card/stepcard";
import { Toaster } from "../sonner";

type ConfLayoutProps = {
  children: React.ReactNode;
  maxSteps?: number;
  currentStep?: number;
  isOptionalCallback?: () => void;
};

export const ConfLayout: React.FC<ConfLayoutProps> = ({
  children,
  // Accept but ignore for now; reserved for future step indicator
  maxSteps,
  currentStep,
  isOptionalCallback,
}) => {
  const pathname = usePathname();
  const [meta, setMeta] = useState({ title: "", subtitle: "" });
  const { t, isLocaleReady } = useLocale();

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
          <div className="rounded-md border p-8 sm:mx-auto sm:w-full sm:max-w-[600px]">
            <div className="mx-auto sm:max-w-[520px]">
              <header>
                {isLocaleReady ? (
                  <>
                    <p className="font-cal mb-3 text-[28px] font-medium leading-7">
                      {meta.title.replace(` | ${APP_NAME}`, "")}&nbsp;
                    </p>
                    <p className="text-subtle font-sans text-sm font-normal">{meta.subtitle}&nbsp;</p>
                  </>
                ) : (
                  <>
                    <SkeletonText className="h-6 w-1/2" />
                    <SkeletonText className="mt-4 h-4 w-3/4" />
                  </>
                )}
              </header>
              <Steps maxSteps={maxSteps ?? 2} currentStep={currentStep ?? 0} nextStep={noop} />
            </div>
            <StepCard>{children}</StepCard>
          </div>
        </div>
        {isOptionalCallback && (
          <div className="mt-4 flex justify-center">
            <Button data-testid="handle-later-button" onClick={isOptionalCallback}>
              {t("ill_do_this_later")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfLayout;
