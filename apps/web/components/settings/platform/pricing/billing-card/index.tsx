import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

type PlatformBillingCardProps = {
  plan: string;
  description: string;
  pricing?: number;
  includes: string[];
  isLoading?: boolean;
  currentPlan?: boolean;
  handleSubscribe?: () => void;
};

export const PlatformBillingCard = ({
  plan,
  description,
  pricing,
  includes,
  isLoading,
  handleSubscribe,
  currentPlan,
}: PlatformBillingCardProps) => {
  const { t } = useLocale();
  return (
    <div className="border-subtle max-w-[450px] rounded-2xl border p-5 md:mx-4">
      <div className="pb-5">
        <h1 className="border-b pb-2 pt-1 text-center text-2xl font-bold">
          {plan}
          {currentPlan && (
            <>
              <Button
                type="button"
                StartIcon="circle-check"
                className="bg-default hover:bg-default cursor-none text-green-500 hover:cursor-pointer"
                tooltip={t("this_is_your_current_plan")}
              />
            </>
          )}
        </h1>
        <p className="pb-5 pt-3 text-base">{description}</p>
        <h1 className="text-3xl font-semibold">
          {pricing !== undefined && (
            <>
              US${pricing} <span className="text-sm">{t("per_month")}</span>
            </>
          )}
        </h1>
      </div>
      {!currentPlan && (
        <div>
          <Button
            loading={isLoading}
            onClick={handleSubscribe}
            className="flex w-full items-center justify-center">
            {pricing !== undefined ? t("subscribe") : t("schedule_a_time")}
          </Button>
        </div>
      )}
      <div className="mt-5">
        <p>{t("this_includes")}</p>
        {includes.map((feature) => {
          return (
            <div key={feature} className="my-2 flex">
              <div className="pr-2">&bull;</div>
              <div>{feature}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
