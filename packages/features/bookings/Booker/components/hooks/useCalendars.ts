import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { shallow } from "zustand/shallow";

import { useTimePreferences } from "@calcom/features/bookings/lib";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";

import { useBookerStore } from "../../store";
import { useOverlayCalendarStore } from "../OverlayCalendar/store";
import { useLocalSet } from "./useLocalSet";

export type UseCalendarsReturnType = ReturnType<typeof useCalendars>;
type UseCalendarsProps = {
  hasSession: boolean;
};
export type ToggledConnectedCalendars = Set<{
  credentialId: number;
  externalId: string;
}>;

export const useCalendars = ({ hasSession }: UseCalendarsProps) => {
  const searchParams = useSearchParams();
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const { timezone } = useTimePreferences();
  const switchEnabled =
    searchParams?.get("overlayCalendar") === "true" ||
    localStorage?.getItem("overlayCalendarSwitchDefault") === "true";
  const { set, clearSet } = useLocalSet<{
    credentialId: number;
    externalId: string;
  }>("toggledConnectedCalendars", []);
  const utils = trpc.useUtils();

  const [calendarSettingsOverlay] = useOverlayCalendarStore(
    (state) => [state.calendarSettingsOverlayModal, state.setCalendarSettingsOverlayModal],
    shallow
  );

  const { data: overlayBusyDates, isError } = trpc.viewer.availability.calendarOverlay.useQuery(
    {
      loggedInUsersTz: timezone || "Europe/London",
      dateFrom: selectedDate,
      dateTo: selectedDate,
      calendarsToLoad: Array.from(set).map((item) => ({
        credentialId: item.credentialId,
        externalId: item.externalId,
      })),
    },
    {
      enabled: hasSession && set.size > 0 && switchEnabled,
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (!isError) return;
      clearSet();
    },
    [isError]
  );

  const { data, isPending } = trpc.viewer.calendars.connectedCalendars.useQuery(undefined, {
    enabled: !!calendarSettingsOverlay || Boolean(searchParams?.get("overlayCalendar")),
  });

  return {
    overlayBusyDates,
    isOverlayCalendarEnabled: switchEnabled,
    connectedCalendars: data?.connectedCalendars || [],
    loadingConnectedCalendar: isPending,
    onToggleCalendar: (data: ToggledConnectedCalendars) => {
      utils.viewer.availability.calendarOverlay.reset();
    },
  };
};
