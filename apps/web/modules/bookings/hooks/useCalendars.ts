import { useOverlayCalendarStore } from "@calcom/features/bookings/Booker/components/OverlayCalendar/store";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { ToggledConnectedCalendars } from "@calcom/features/bookings/Booker/types";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

type UseCalendarsProps = {
  hasSession: boolean;
};

export const useCalendars = ({ hasSession }: UseCalendarsProps) => {
  const searchParams = useSearchParams();
  const selectedDate = useBookerStore((state) => state.selectedDate);
  const { timezone } = useTimePreferences();
  const switchEnabled =
    searchParams?.get("overlayCalendar") === "true" ||
    localStorage?.getItem("overlayCalendarSwitchDefault") === "true";

  const [set, setSet] = useState<Set<ToggledConnectedCalendars>>(() => {
    const storedValue = localStorage.getItem("toggledConnectedCalendars");
    return storedValue ? new Set(JSON.parse(storedValue)) : new Set([]);
  });

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
      setSet(new Set([]));
    },
    [isError]
  );

  const { data, isPending } = trpc.viewer.calendars.connectedCalendars.useQuery(
    {
      skipSync: true,
    },
    {
      enabled: !!calendarSettingsOverlay || Boolean(searchParams?.get("overlayCalendar")),
    }
  );

  return {
    overlayBusyDates,
    isOverlayCalendarEnabled: switchEnabled,
    connectedCalendars: data?.connectedCalendars || [],
    loadingConnectedCalendar: isPending,
    onToggleCalendar: setSet,
  };
};
