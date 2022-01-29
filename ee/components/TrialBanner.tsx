import dayjs from "dayjs";

import { TRIAL_LIMIT_DAYS } from "@lib/config/constants";
import { useLocale } from "@lib/hooks/useLocale";

import { useMeQuery } from "@components/Shell";
import Button from "@components/ui/Button";

const TrialBanner = () => {
  const { t } = useLocale();
  const query = useMeQuery();
  const user = query.data;

  if (!user || user.plan !== "TRIAL") return null;

  const trialDaysLeft = dayjs(user.createdDate)
    .add(TRIAL_LIMIT_DAYS + 1, "day")
    .diff(dayjs(), "day");

  return (
    <div
      className="hidden p-4 m-4 text-sm font-medium text-center text-gray-600 bg-yellow-200 rounded-md sm:block"
      data-testid="trial-banner">
      <div className="mb-2 text-left">{t("trial_days_left", { days: trialDaysLeft })}</div>
      <Button
        href="/settings/billing"
        color="minimal"
        className="justify-center w-full border-2 border-gray-600 hover:bg-yellow-100">
        {t("upgrade_now")}
      </Button>
    </div>
  );
};

export default TrialBanner;
