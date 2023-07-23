import { useRouter } from "next/router";
import { useEffect } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import classNames from "@calcom/lib/classNames";
import defaultEvents from "@calcom/lib/defaultEvents";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

import type { PublicEvent } from "../../types";

export const EventDuration = ({ event }: { event: PublicEvent }) => {
  const { t } = useLocale();
  const router = useRouter();
  const [selectedDuration, setSelectedDuration] = useBookerStore((state) => [
    state.selectedDuration,
    state.setSelectedDuration,
  ]);

  // Sets initial value of selected duration to the default duration.
  useEffect(() => {
    // Only store event duration in url if event has multiple durations.
    if (!selectedDuration && (event.metadata?.multipleDuration || event.isDynamic))
      setSelectedDuration(event.length);
  }, [
    selectedDuration,
    setSelectedDuration,
    event.length,
    event.metadata?.multipleDuration,
    event.isDynamic,
  ]);

  if (!event?.metadata?.multipleDuration && !event.isDynamic)
    return <>{t("multiple_duration_mins", { count: event.length })}</>;

  return (
    <div className="flex flex-wrap gap-2">
      {event.metadata?.multipleDuration &&
        event.metadata.multipleDuration.map((duration) => (
          <Badge
            variant="gray"
            className={classNames(selectedDuration === duration && "bg-brand-default text-brand")}
            size="md"
            key={duration}
            onClick={() => setSelectedDuration(duration)}>{`${duration} ${t("minute_timeUnit")}`}</Badge>
        ))}
      {event.isDynamic &&
        defaultEvents.map((event) => (
          <Badge
            variant="gray"
            className={classNames(selectedDuration === event.length && "bg-brand-default text-brand")}
            size="md"
            key={event.slug}
            onClick={() => {
              setSelectedDuration(event.length);
              router.push({
                query: {
                  ...router.query,
                  type: event.slug,
                  duration: event.length,
                },
              });
            }}>
            {event.title}
          </Badge>
        ))}
    </div>
  );
};
