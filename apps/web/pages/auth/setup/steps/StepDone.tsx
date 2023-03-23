import { useRouter } from "next/router";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FiCheck } from "@calcom/ui/components/icon";

const StepDone = () => {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <form
      id="wizard-step-1"
      name="wizard-step-1"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        router.replace(`/auth/setup?step=2&category=calendar`);
      }}>
      <div className="min-h-36 my-6 flex flex-col items-center justify-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-600 dark:bg-white">
          <FiCheck className="inline-block h-10 w-10 text-white dark:bg-white dark:text-gray-600" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="mt-6 mb-1 text-lg font-medium dark:text-gray-300">{t("all_done")}</h2>
        </div>
      </div>
    </form>
  );
};

export default StepDone;
