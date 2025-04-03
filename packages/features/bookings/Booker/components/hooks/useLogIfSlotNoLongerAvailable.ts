import { useEffect } from "react";

import { getCookie } from "@calcom/lib/cookie";

import { logEvent } from "../../utils/logEvent";

/**
 * Ensures that the event is logged only once regardless of the multiple times the component is rendered
 */
export const useLogIfSlotNoLongerAvailable = ({
  isTimeslotUnavailable,
  timeslot,
  timezone,
}: {
  isTimeslotUnavailable: boolean;
  timeslot: string | null;
  timezone: string;
}) => {
  useEffect(() => {
    if (isTimeslotUnavailable) {
      logEvent("slotNoLongerAvailable", {
        timeslot,
        timezone,
        url: document.URL,
        uid: getCookie("uid"),
      });
    }
  }, [isTimeslotUnavailable, timeslot, timezone]);
};
