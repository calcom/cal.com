import { useEffect } from "react";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { BookerEvent } from "@calcom/features/bookings/types";
import classNames from "@calcom/lib/classNames";
import { getDurationFormatted } from "@calcom/lib/getDurationFormatted";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

export const EventDuration = ({
  event,
}: {
  event: Pick<BookerEvent, "length" | "metadata" | "isDynamic">;
}) => {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
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

  if ((!event?.metadata?.multipleDuration && !isDynamicEvent) || isPlatform)
    return <>{getDurationFormatted(event.length, t)}</>;

  const durations = event?.metadata?.multipleDuration || [15, 30, 60, 90];

  return (
    <div className="flex flex-wrap gap-2">
      {durations
        .filter((dur) => state !== "booking" || dur === selectedDuration)
        .map((duration) => (
          <Badge
            data-testId={`multiple-choice-${duration}mins`}
            data-active={selectedDuration === duration ? "true" : "false"}
            variant="gray"
            className={classNames(selectedDuration === duration && "bg-brand-default text-brand")}
            size="md"
            key={duration}
            onClick={() => setSelectedDuration(duration)}>
            {getDurationFormatted(duration, t)}
          </Badge>
        ))}
    </div>
  );
};
