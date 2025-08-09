import { useMemo } from "react";

import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { STEPS } from "./constants";

type StepConfig = {
  getTitle: (appName?: string) => string;
  getDescription: (appName?: string) => string;
  stepNumber: number;
};

type UseStepManagerProps = {
  step: AppOnboardingSteps;
  configureStep: boolean;
  showEventTypesStep: boolean;
  isOnlySingleAccountToSelect: boolean;
  appName: string;
};

type StepManagerReturn = {
  currentStep: AppOnboardingSteps;
  maxSteps: number;
  title: string;
  description: string;
  stepNumber: number;
};

export function useStepManager({
  step,
  configureStep,
  showEventTypesStep,
  isOnlySingleAccountToSelect,
  appName,
}: UseStepManagerProps): StepManagerReturn {
  const { t } = useLocale();

  const excludeSteps: AppOnboardingSteps[] = [];

  if (isOnlySingleAccountToSelect) {
    excludeSteps.push(AppOnboardingSteps.ACCOUNTS_STEP);
  }

  if (!showEventTypesStep) {
    excludeSteps.push(AppOnboardingSteps.EVENT_TYPES_STEP);
    excludeSteps.push(AppOnboardingSteps.CONFIGURE_STEP);
  }

  const visibleSteps = STEPS.filter((step) => !excludeSteps.includes(step));

  const getStepNumber = (step: AppOnboardingSteps): number => {
    const stepIndex = visibleSteps.indexOf(step);
    return stepIndex === -1 ? 0 : stepIndex + 1;
  };

  const stepConfigs: Record<AppOnboardingSteps, StepConfig> = {
    [AppOnboardingSteps.ACCOUNTS_STEP]: {
      getTitle: () => t("select_account_header"),
      getDescription: (appName) =>
        t("select_account_description", { appName, interpolation: { escapeValue: false } }),
      stepNumber: getStepNumber(AppOnboardingSteps.ACCOUNTS_STEP),
    },
    [AppOnboardingSteps.EVENT_TYPES_STEP]: {
      getTitle: () => t("select_event_types_header"),
      getDescription: (appName) =>
        t("select_event_types_description", { appName, interpolation: { escapeValue: false } }),
      stepNumber: getStepNumber(AppOnboardingSteps.EVENT_TYPES_STEP),
    },
    [AppOnboardingSteps.CONFIGURE_STEP]: {
      getTitle: (appName) => t("configure_app_header", { appName, interpolation: { escapeValue: false } }),
      getDescription: () => t("configure_app_description"),
      stepNumber: getStepNumber(AppOnboardingSteps.CONFIGURE_STEP),
    },
  };

  const currentStep: AppOnboardingSteps = useMemo(() => {
    if (step === AppOnboardingSteps.EVENT_TYPES_STEP && configureStep) {
      return AppOnboardingSteps.CONFIGURE_STEP;
    }
    return step;
  }, [step, configureStep]);

  const maxSteps = visibleSteps.length;

  const currentStepConfig = stepConfigs[currentStep];

  return {
    currentStep,
    maxSteps,
    title: currentStepConfig.getTitle(appName),
    description: currentStepConfig.getDescription(appName),
    stepNumber: currentStepConfig.stepNumber,
  };
}
