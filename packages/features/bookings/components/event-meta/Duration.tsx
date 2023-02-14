import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

import { PublicEvent } from "../../types";

export const EventDuration = ({ event }: { event: PublicEvent }) => {
  const { t } = useLocale();
  // @TODO: save in form state
  const [selectedDuration, setSelectedDuration] = useState(`${event.length}`);

  // @TODO: mins should be a translation?
  if (!event?.metadata?.multipleDuration) return <>{event.length} mins</>;

  return (
    <div className="flex flex-wrap gap-2">
      {event.metadata.multipleDuration.map((duration) => (
        <Badge
          variant="gray"
          className={classNames(
            selectedDuration === `${duration}` &&
              "bg-darkgray-200 dark:bg-darkgray-900 text-white dark:text-black"
          )}
          size="lg"
          key={duration}
          onClick={() => setSelectedDuration(`${duration}`)}>{`${duration} ${t("minute_timeUnit")}`}</Badge>
      ))}
    </div>
  );
};
