import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { shallow } from "zustand/shallow";

import { useTimePreferences } from "@calcom/features/bookings/lib";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";

import { useBookerStore } from "../../store";
import { useOverlayCalendarStore } from "../OverlayCalendar/store";
import { useLocalSet } from "./useLocalSet";

export type UseCalendarsReturnType = ReturnType<typeof useCalendars>;
export const useCalendars = () => {
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
  const utils = trpc.useContext();
  const { data: session } = useSession();

  const [calendarSettingsOverlay] = useOverlayCalendarStore(
    (state) => [state.calendarSettingsOverlayModal, state.setCalendarSettingsOverlayModal],
    shallow
  );

  const { data: overlayBusyDates } = trpc.viewer.availability.calendarOverlay.useQuery(
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
      enabled: !!session && set.size > 0 && switchEnabled,
      onError: () => {
        clearSet();
      },
    }
  );

  const { data, isLoading } = trpc.viewer.connectedCalendars.useQuery(undefined, {
    enabled: !!calendarSettingsOverlay || Boolean(searchParams?.get("overlayCalendar")),
  });

  return {
    overlayBusyDates,
    isOverlayCalendarEnabled: switchEnabled,
    connectedCalendars: data?.connectedCalendars || [],
    loadingConnectedCalendar: isLoading,
    onToggleCalendar: () => {
      utils.viewer.availability.calendarOverlay.reset();
    },
  };
};
