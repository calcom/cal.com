"use client";

import classNames from "@calcom/ui/classNames";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { Button } from "../../button";
import { Steps } from "../../form/step";
import { useWizardState } from "./useWizardState";

export type WizardStep = {
  title: string;
  containerClassname?: string;
  contentClassname?: string;
  description: string;
  content?:
    | ((
        setIsPending: Dispatch<SetStateAction<boolean>>,
        nav: { onNext: () => void; onPrev: () => void; step: number; maxSteps: number }
      ) => JSX.Element)
    | JSX.Element;
  isEnabled?: boolean;
  isPending?: boolean;
  customActions?: boolean;
};

export interface WizardFormProps {
  steps: WizardStep[];
  containerClassname?: string;
  prevLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  stepLabel?: React.ComponentProps<typeof Steps>["stepLabel"];
  defaultStep?: number;
  disableNavigation?: boolean;
}

export function WizardForm({
  steps,
  containerClassname,
  prevLabel = "Back",
  nextLabel = "Next",
  finishLabel = "Finish",
  stepLabel,
  defaultStep = 1,
  disableNavigation = false,
}: WizardFormProps) {
  const { currentStep, maxSteps, nextStep, goToStep, prevStep, isFirstStep, isLastStep } = useWizardState(
    defaultStep,
    steps.length
  );
  const [currentStepisPending, setCurrentStepisPending] = useState(false);
  const currentStepData = steps[currentStep - 1];

  useEffect(() => {
    setCurrentStepisPending(false);
  }, [currentStep]);

  return (
    <div className="mx-auto mt-4 print:w-full" data-testid="wizard-form">
      <div className={classNames("overflow-hidden md:mb-2 md:w-[700px]", containerClassname)}>
        <div className="px-6 py-5">
          <h1 className="font-cal text-emphasis text-2xl" data-testid="step-title">
            {currentStepData.title}
          </h1>
          <p className="text-subtle text-sm" data-testid="step-description">
            {currentStepData.description}
          </p>
          {!disableNavigation && (
            <Steps
              maxSteps={maxSteps}
              currentStep={currentStep}
              navigateToStep={goToStep}
              stepLabel={stepLabel}
              data-testid="wizard-step-component"
            />
          )}
        </div>
      </div>
      <div className={classNames("mb-8 overflow-hidden md:w-[700px]", containerClassname)}>
        <div
          className={classNames(
            "bg-default border-subtle max-w-3xl rounded-2xl border px-4 py-3 sm:p-4 ",
            currentStepData.contentClassname
          )}>
          {typeof currentStepData.content === "function"
            ? currentStepData.content(setCurrentStepisPending, {
                onNext: nextStep,
                onPrev: prevStep,
                step: currentStep,
                maxSteps,
              })
            : currentStepData.content}
        </div>
        {!disableNavigation && !currentStepData.customActions && (
          <div className="flex justify-end px-4 py-4 print:hidden sm:px-6">
            {!isFirstStep && (
              <Button color="secondary" onClick={prevStep}>
                {prevLabel}
              </Button>
            )}

            <Button
              tabIndex={0}
              loading={currentStepisPending}
              type="submit"
              color="primary"
              form={`wizard-step-${currentStep}`}
              disabled={currentStepData.isEnabled === false}
              className="relative ml-2">
              {isLastStep ? finishLabel : nextLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
