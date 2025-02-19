import classNames from "@calcom/lib/classNames";

type StepWithNav = {
  maxSteps: number;
  currentStep: number;
  nextStep: () => void;
  disableNavigation?: false;
  stepLabel?: (currentStep: number, maxSteps: number) => string;
};

type StepWithoutNav = {
  maxSteps: number;
  currentStep: number;
  nextStep?: undefined;
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
    disableNavigation = false,
    stepLabel = (currentStep, totalSteps) => `Step ${currentStep} of ${totalSteps}`,
  } = props;
  return (
    <div className="mt-6 space-y-2">
      <p className="text-subtle text-xs font-medium">{stepLabel(currentStep, maxSteps)}</p>
      <div data-testid="step-indicator-container" className="flex w-full space-x-2 rtl:space-x-reverse">
        {new Array(maxSteps).fill(0).map((_s, index) => {
          return index <= currentStep - 1 ? (
            <div
              key={`step-${index}`}
              onClick={() => nextStep?.()}
              className={classNames(
                "bg-inverted h-1 w-full rounded-[1px]",
                index < currentStep - 1 && !disableNavigation ? "cursor-pointer" : ""
              )}
              data-testid={`step-indicator-${index}`}
            />
          ) : (
            <div
              key={`step-${index}`}
              className="bg-emphasis h-1 w-full rounded-[1px] opacity-25"
              data-testid={`step-indicator-${index}`}
            />
          );
        })}
      </div>
    </div>
  );
};
export { Steps };
