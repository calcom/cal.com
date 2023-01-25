import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

interface ISteps {
  maxSteps: number;
  currentStep: number;
  navigateToStep: (step: number) => void;
  stepOfLabel?: (currentStep: number, maxSteps: number) => string;
}

const Steps = (props: ISteps) => {
  const { t } = useLocale();
  const {
    maxSteps,
    currentStep,
    navigateToStep,
    stepOfLabel = (currentStep: number, maxSteps: number) =>
      t("current_step_of_total", { currentStep: currentStep, maxSteps }),
  } = props;
  return (
    <div className="mt-6 space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-white">
        {stepOfLabel(currentStep, maxSteps)}
      </p>
      <div className="flex w-full space-x-2 rtl:space-x-reverse">
        {new Array(maxSteps).fill(0).map((_s, index) => {
          return index <= currentStep - 1 ? (
            <div
              key={`step-${index}`}
              onClick={() => navigateToStep(index)}
              className={classNames(
                "h-1 w-full rounded-[1px] bg-black dark:bg-white",
                index < currentStep - 1 ? "cursor-pointer" : ""
              )}
            />
          ) : (
            <div key={`step-${index}`} className="h-1 w-full rounded-[1px] bg-black bg-opacity-25" />
          );
        })}
      </div>
    </div>
  );
};
export { Steps };
