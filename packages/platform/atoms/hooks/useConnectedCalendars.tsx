import { useQuery } from "@tanstack/react-query";
import { shallow } from "zustand/shallow";

import { useOverlayCalendarStore } from "@calcom/features/bookings/Booker/components/OverlayCalendar/store";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import type { ApiResponse } from "@calcom/platform-types";

import http from "../lib/http";

export const QUERY_KEY = "get-connected-calendars";
export const useConnectedCalendars = () => {
  const [calendarSettingsOverlay] = useOverlayCalendarStore(
    (state) => [state.calendarSettingsOverlayModal, state.setCalendarSettingsOverlayModal],
    shallow
  );
  const calendars = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => {
      return http.get<ApiResponse<ConnectedDestinationCalendars>>("/ee/calendars").then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return res.data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: !!calendarSettingsOverlay,
  });

  return calendars;
};
