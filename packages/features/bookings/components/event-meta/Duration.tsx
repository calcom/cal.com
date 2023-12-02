import type { TFunction } from "next-i18next";
import { useEffect } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

import type { PublicEvent } from "../../types";

/** Only render in X hours if has for duration of HOURS_THRESHOLD mins more */
const HOURS_THRESHOLD = 120;

/** Render X mins as X hours or X hours Y mins instead of in minutes once above HOURS_THRESHOLD */
const getDurationFormatted = (mins: number, t: TFunction) => {
  if (mins < HOURS_THRESHOLD) return t("multiple_duration_timeUnit", { count: mins, unit: "minute" });
  const hours = Math.floor(mins / 60);
  mins %= 60;
  if (mins === 0) return t("multiple_duration_timeUnit", { count: hours, unit: "hour" });
  return `${t("multiple_duration_timeUnit", { count: hours, unit: "hour" })} ${t(
    "multiple_duration_timeUnit",
    { count: mins, unit: "minute" }
  )}`;
};

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
    return <>{getDurationFormatted(event.length, t)}</>;

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
