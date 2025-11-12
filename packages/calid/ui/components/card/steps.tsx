import { cn } from "@calid/features/lib/cn";

type StepWithNav = {
  maxSteps: number;
  currentStep: number;
  nextStep: () => void;
  goToStep?: (stepIndex: number) => void;
  disableNavigation?: false;
  stepLabel?: (currentStep: number, maxSteps: number) => string;
};

type StepWithoutNav = {
  maxSteps: number;
  currentStep: number;
  nextStep?: undefined;
  goToStep?: undefined;
  disableNavigation: true;
  stepLabel?: (currentStep: number, maxSteps: number) => string;
};

// Discriminative union on disableNavigation prop
type StepsProps = StepWithNav | StepWithoutNav;

const Steps = (props: StepsProps) => {
  const {
    maxSteps,
    currentStep,
    nextStep,
    goToStep,
    disableNavigation = false,
    stepLabel = (currentStep, totalSteps) => `Step ${currentStep} of ${totalSteps}`,
  } = props;

  const handleStepClick = (index: number) => {
    if (disableNavigation || index >= currentStep - 1) return;

    // Navigate to the clicked step (which has already been visited)
    if (goToStep) {
      goToStep(index);
    }
  };

  return (
    <div className="mt-6 space-y-2">
      <p className="text-subtle text-xs font-medium">{stepLabel(currentStep, maxSteps)}</p>
      <div data-testid="step-indicator-container" className="flex w-full space-x-2 rtl:space-x-reverse">
        {new Array(maxSteps).fill(0).map((_s, index) => {
          const isCompleted = index < currentStep - 1;
          const isCurrent = index === currentStep - 1;
          const isClickable = isCompleted && !disableNavigation;

          return index <= currentStep - 1 ? (
            <div
              key={`step-${index}`}
              onClick={() => handleStepClick(index)}
              className={cn(
                "bg-active h-1 w-full rounded-[1px] dark:bg-gray-200",
                isClickable && "cursor-pointer transition-opacity hover:opacity-80"
              )}
              data-testid={`step-indicator-${index}`}
            />
          ) : (
            <div
              key={`step-${index}`}
              className="bg-emphasis h-1 w-full rounded-[1px]"
              data-testid={`step-indicator-${index}`}
            />
          );
        })}
      </div>
    </div>
  );
};
export { Steps };
