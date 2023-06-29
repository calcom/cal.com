import { useEffect } from "react";

import { useBookerNavigation } from "@calcom/features/bookings/Booker/utils/navigation";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

import type { PublicEvent } from "../../types";

export const EventDuration = ({ event }: { event: PublicEvent }) => {
  const { t } = useLocale();
  const { duration: selectedDuration = event.length, updateQuery } = useBookerNavigation();

  // Sets initial value of selected duration to the default duration.
  useEffect(() => {
    // Only store event duration in url if event has multiple durations.
    if (!selectedDuration && event.metadata?.multipleDuration) updateQuery({ duration: `${event.length}` });
  }, [selectedDuration, event.length, event.metadata?.multipleDuration]);

  if (!event?.metadata?.multipleDuration) return <>{t("multiple_duration_mins", { count: event.length })}</>;

  return (
    <div className="flex flex-wrap gap-2">
      {event.metadata.multipleDuration.map((duration) => (
        <Badge
          variant="gray"
          className={classNames(selectedDuration === duration && "bg-inverted text-inverted")}
          size="md"
          key={duration}
          onClick={() => updateQuery({ duration: `${duration}` })}>{`${duration} ${t(
          "minute_timeUnit"
        )}`}</Badge>
      ))}
    </div>
  );
};
