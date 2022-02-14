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
      className="m-4 hidden rounded-md bg-yellow-200 p-4 text-center text-sm font-medium text-gray-600 lg:block"
      data-testid="trial-banner">
      <div className="mb-2 text-left">{t("trial_days_left", { days: trialDaysLeft })}</div>
      <Button
        href="/api/upgrade"
        color="minimal"
        className="w-full justify-center border-2 border-gray-600 hover:bg-yellow-100">
        {t("upgrade_now")}
      </Button>
    </div>
  );
};

export default TrialBanner;
