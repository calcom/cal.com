import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";

const StepDone = (props: {
  currentStep: number;
  nextStepPath: string;
  setIsPending: Dispatch<SetStateAction<boolean>>;
}) => {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <form
      id={`wizard-step-${props.currentStep}`}
      name={`wizard-step-${props.currentStep}`}
      className="flex justify-center stack-y-4"
      onSubmit={(e) => {
        props.setIsPending(true);
        e.preventDefault();
        router.replace(props.nextStepPath);
      }}>
      <div className="min-h-36 my-6 flex flex-col items-center justify-center">
        <div className="dark:bg-default flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-600">
          <Icon
            name="check"
            className="text-inverted dark:bg-default dark:text-default inline-block h-10 w-10"
          />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="mb-1 mt-6 text-lg font-medium dark:text-gray-300">{t("all_done")}</h2>
        </div>
      </div>
    </form>
  );
};

export default StepDone;
