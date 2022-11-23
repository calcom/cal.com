import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

const StepDone = () => {
  const { t } = useLocale();

  return (
    <div className="min-h-36 my-6 flex flex-col items-center justify-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-600 dark:bg-white">
        <Icon.FiCheck className="inline-block h-10 w-10 text-white dark:bg-white dark:text-gray-600" />
      </div>
      <div className="max-w-[420px] text-center">
        <h2 className="mt-6 mb-1 text-lg font-medium dark:text-gray-300">{t("all_done")}</h2>
      </div>
    </div>
  );
};

export default StepDone;
