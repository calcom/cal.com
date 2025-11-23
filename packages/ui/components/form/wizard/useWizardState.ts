import { createParser, useQueryState } from "nuqs";
import { useCallback } from "react";

export interface WizardState {
  currentStep: number;
  maxSteps: number;
}

const createStepParser = (defaultStep: number, maxSteps: number) =>
  createParser({
    parse: (value: string) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) return defaultStep;
      // Ensure step is within bounds
      if (parsed < 1) return 1;
      if (parsed > maxSteps) return maxSteps;
      return parsed;
    },
    serialize: (value: number) => value.toString(),
  });

export function useWizardState(defaultStep = 1, maxSteps: number) {
  const stepParser = createStepParser(defaultStep, maxSteps);
  const [step, setStep] = useQueryState("step", stepParser.withDefault(defaultStep));

  const goToStep = useCallback(
    (newStep: number) => {
      // Convert 0-based newStep to 1-based for URL (?step=1), So actual step = newStep+1
      setStep(Math.min(Math.max(newStep + 1, 1), maxSteps));
    },
    [setStep, maxSteps]
  );

  const nextStep = useCallback(() => {
    if (step < maxSteps) {
      setStep((prev) => prev + 1);
    }
  }, [step, maxSteps, setStep]);

  const prevStep = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  }, [step, setStep]);

  return {
    currentStep: step,
    maxSteps,
    goToStep,
    nextStep,
    prevStep,
    isFirstStep: step === 1,
    isLastStep: step === maxSteps,
  };
}
