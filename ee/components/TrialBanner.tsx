import dayjs from "dayjs";

import getStripe from "@ee/lib/stripe/client";

import { useLocale } from "@lib/hooks/useLocale";

import { useMeQuery } from "@components/Shell";
import Button from "@components/ui/Button";

const TrialBanner = () => {
  const { t } = useLocale();
  const query = useMeQuery();
  const user = query.data;

  if (!user || user.plan !== "TRIAL") return null;

  const trialDaysLeft = dayjs(user.createdDate).add(14, "day").diff(dayjs(), "day");

  const handleClick = async () => {
    const response = await fetch(`/api/upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    console.log(`data`, data);

    if (!(response.status >= 200 && response.status < 300)) {
      alert(data.message);
      return;
    }

    // Redirect to Checkout.
    const stripe = await getStripe();
    const { error } = await stripe!.redirectToCheckout({
      sessionId: data.id,
    });

    console.warn(error.message);
  };

  return (
    <div className="p-4 m-4 text-sm font-medium text-center text-gray-600 bg-yellow-200 rounded-md">
      <div className="mb-2 text-left">{t("trial_days_left", { days: trialDaysLeft })}</div>
      <Button
        color="minimal"
        className="justify-center w-full border-2 border-gray-600 hover:bg-yellow-100"
        onClick={handleClick}>
        {t("upgrade_now")}
      </Button>
    </div>
  );
};

export default TrialBanner;
