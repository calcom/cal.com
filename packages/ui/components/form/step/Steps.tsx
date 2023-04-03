import classNames from "@calcom/lib/classNames";

interface ISteps {
  maxSteps: number;
  currentStep: number;
  navigateToStep: (step: number) => void;
  stepLabel?: (currentStep: number, maxSteps: number) => string;
}

const Steps = (props: ISteps) => {
  const {
    maxSteps,
    currentStep,
    navigateToStep,
    stepLabel = (currentStep, totalSteps) => `Step ${currentStep} of ${totalSteps}`,
  } = props;
  return (
    <div className="mt-6 space-y-2">
      <p className="text-subtle text-xs font-medium">{stepLabel(currentStep, maxSteps)}</p>
      <div className="flex w-full space-x-2 rtl:space-x-reverse">
        {new Array(maxSteps).fill(0).map((_s, index) => {
          return index <= currentStep - 1 ? (
            <div
              key={`step-${index}`}
              onClick={() => navigateToStep(index)}
              className={classNames(
                "bg-inverted h-1 w-full rounded-[1px]",
                index < currentStep - 1 ? "cursor-pointer" : ""
              )}
            />
          ) : (
            <div key={`step-${index}`} className="bg-emphasis h-1 w-full rounded-[1px] opacity-25" />
          );
        })}
      </div>
    </div>
  );
};
export { Steps };
