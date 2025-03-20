import { useState } from "react";

import { BOOKER_NUMBER_OF_DAYS_TO_LOAD } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";

type Props = {
  onButtonClick: () => void;
  dayCount: number | null;
  visible: boolean;
  isScheduleLoading: boolean;
};
export function HavingTroubleFindingTime(props: Props) {
  const { t } = useLocale();
  const [internalClick, setInternalClick] = useState(false);

  if (!props.visible) return null;

  // Easiest way to detect if its not enabled
  if (
    (process.env.NEXT_PUBLIC_BOOKER_NUMBER_OF_DAYS_TO_LOAD == "0" && BOOKER_NUMBER_OF_DAYS_TO_LOAD == 0) ||
    !process.env.NEXT_PUBLIC_BOOKER_NUMBER_OF_DAYS_TO_LOAD
  )
    return null;

  // If we have clicked this internally - and the schedule above is not loading - hide this banner as there is no use of being able to go backwards
  if (internalClick && !props.isScheduleLoading) return null;
  if (props.isScheduleLoading || !props.dayCount) return null;

  return (
    <div className="bg-default border-subtle mt-6 flex w-1/2 min-w-0 items-center justify-between rounded-[32px] border p-3 text-sm leading-none shadow-sm lg:w-1/3">
      <div className="flex items-center gap-2 overflow-x-hidden">
        <Icon name="info" className="text-default h-4 w-4" />
        <p className="w-full  leading-none">{t("having_trouble_finding_time")}</p>
      </div>
      {/* TODO: we should give this more of a touch target on mobile */}
      <button
        className="inline-flex items-center gap-2 font-medium"
        onClick={(e) => {
          e.preventDefault();
          props.onButtonClick();
          setInternalClick(true);
        }}>
        {t("show_more")} <Icon name="arrow-right" className="h-4 w-4" />
      </button>
    </div>
  );
}
