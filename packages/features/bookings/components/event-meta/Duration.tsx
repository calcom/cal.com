import { useEffect } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

import type { PublicEvent } from "../../types";

export const EventDuration = ({ event }: { event: PublicEvent }) => {
  const { t } = useLocale();
  const [selectedDuration, setSelectedDuration] = useBookerStore((state) => [
    state.selectedDuration,
    state.setSelectedDuration,
  ]);

  // Sets initial value of selected duration to the default duration.
  useEffect(() => {
    if (!selectedDuration) setSelectedDuration(event.length);
  }, [selectedDuration, setSelectedDuration, event.length]);

  if (!event?.metadata?.multipleDuration) return <>{t("multiple_duration_mins", { count: event.length })}</>;

  return (
    <div className="flex flex-wrap gap-2">
      {event.metadata.multipleDuration.map((duration) => (
        <Badge
          variant="gray"
          className={classNames(
            selectedDuration === duration && "bg-darkgray-200 dark:bg-darkgray-900 text-white dark:text-black"
          )}
          size="md"
          key={duration}
          onClick={() => setSelectedDuration(duration)}>{`${duration} ${t("minute_timeUnit")}`}</Badge>
      ))}
    </div>
  );
};
