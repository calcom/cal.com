import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

interface ISteps {
  maxSteps: number;
  currentStep: number;
  navigateToStep: (step: number) => void;
}

const Steps = (props: ISteps) => {
  const { maxSteps, currentStep, navigateToStep } = props;
  const { t } = useLocale();
  return (
    <div className="mt-6 space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-white">
        {t("current_step_of_total", { currentStep: currentStep + 1, maxSteps })}
      </p>
      <div className="flex w-full space-x-2 rtl:space-x-reverse">
        {new Array(maxSteps).fill(0).map((_s, index) => {
          return index <= currentStep ? (
            <div
              key={`step-${index}`}
              onClick={() => navigateToStep(index)}
              className={classNames(
                "h-1 w-full rounded-[1px] bg-black dark:bg-white",
                index < currentStep ? "cursor-pointer" : ""
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
