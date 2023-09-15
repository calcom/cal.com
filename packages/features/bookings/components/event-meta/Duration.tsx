import { useEffect } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

import type { PublicEvent } from "../../types";

export const EventDuration = ({ event }: { event: PublicEvent }) => {
  const { t } = useLocale();
  const [selectedDuration, setSelectedDuration, state] = useBookerStore((state) => [
    state.selectedDuration,
    state.setSelectedDuration,
    state.state,
  ]);

  const isDynamicEvent = "isDynamic" in event && event.isDynamic;

  // Sets initial value of selected duration to the default duration.
  useEffect(() => {
    // Only store event duration in url if event has multiple durations.
    if (!selectedDuration && (event.metadata?.multipleDuration || isDynamicEvent))
      setSelectedDuration(event.length);
  }, [selectedDuration, setSelectedDuration, event.metadata?.multipleDuration, event.length, isDynamicEvent]);

  if (!event?.metadata?.multipleDuration && !isDynamicEvent)
    return <>{t("multiple_duration_mins", { count: event.length })}</>;

  const durations = event?.metadata?.multipleDuration || [15, 30, 60];

  return (
    <div className="flex flex-wrap gap-2">
      {durations
        .filter((dur) => state !== "booking" || dur === selectedDuration)
        .map((duration) => (
          <Badge
            variant="gray"
            className={classNames(selectedDuration === duration && "bg-brand-default text-brand")}
            size="md"
            key={duration}
            onClick={() => setSelectedDuration(duration)}>{`${duration} ${t("minute_timeUnit")}`}</Badge>
        ))}
    </div>
  );
};
