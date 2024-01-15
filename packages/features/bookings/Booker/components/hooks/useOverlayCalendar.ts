import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";

import { useBookerStore } from "../../store";
import { useOverlayCalendarStore } from "../OverlayCalendar/store";
import { useLocalSet } from "./useLocalSet";

export type useOverlayCalendarReturnType = ReturnType<typeof useOverlayCalendar>;

export const useOverlayCalendar = () => {
  const utils = trpc.useContext();
  const { set, toggleValue, hasItem, clearSet } = useLocalSet<{
    credentialId: number;
    externalId: string;
  }>("toggledConnectedCalendars", []);
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [initalised, setInitalised] = useState(false);
  const [continueWithProvider, setContinueWithProvider] = useOverlayCalendarStore(
    (state) => [state.continueWithProviderModal, state.setContinueWithProviderModal],
    shallow
  );
  const [calendarSettingsOverlay, setCalendarSettingsOverlay] = useOverlayCalendarStore(
    (state) => [state.calendarSettingsOverlayModal, state.setCalendarSettingsOverlayModal],
    shallow
  );
  const setOverlayBusyDates = useOverlayCalendarStore((state) => state.setOverlayBusyDates);
  const switchEnabled =
    searchParams?.get("overlayCalendar") === "true" ||
    localStorage?.getItem("overlayCalendarSwitchDefault") === "true";

  const selectedDate = useBookerStore((state) => state.selectedDate);
  const { timezone } = useTimePreferences();
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
  useEffect(() => {
    if (overlayBusyDates) {
      const nowDate = dayjs();
      const usersTimezoneDate = nowDate.tz(timezone);

      const offset = (usersTimezoneDate.utcOffset() - nowDate.utcOffset()) / 60;

      const offsettedArray = overlayBusyDates.map((item) => {
        return {
          ...item,
          start: dayjs(item.start).add(offset, "hours").toDate(),
          end: dayjs(item.end).add(offset, "hours").toDate(),
        };
      });
      setOverlayBusyDates(offsettedArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayBusyDates]);

  const { data, isLoading } = trpc.viewer.connectedCalendars.useQuery(undefined, {
    enabled: !!calendarSettingsOverlay || Boolean(searchParams?.get("overlayCalendar")),
  });

  useEffect(() => {
    if (data?.connectedCalendars && set.size === 0 && !initalised) {
      data?.connectedCalendars.forEach((item) => {
        item.calendars?.forEach((cal) => {
          const id = { credentialId: item.credentialId, externalId: cal.externalId };
          if (cal.primary) {
            toggleValue(id);
          }
        });
      });
      setInitalised(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hasItem, set, initalised]);

  const handleToggleConnectedCalendar = (externalCalendarId: string, credentialId: number) => {
    toggleValue({
      credentialId: credentialId,
      externalId: externalCalendarId,
    });
    setOverlayBusyDates([]);
    utils.viewer.availability.calendarOverlay.reset();
  };

  return {
    isOverlayCalendarEnabled: switchEnabled,
    connectedCalendars: data?.connectedCalendars || [],
    loadingConnectedCalendar: isLoading,
    isOpenOverlayContinueModal: continueWithProvider,
    isOpenOverlaySettingsModal: calendarSettingsOverlay,
    handleCloseContinueModal: (val: boolean) => setContinueWithProvider(val),
    handleCloseSettingsModal: (val: boolean) => setCalendarSettingsOverlay(val),
    handleToggleConnectedCalendar,
  };
};
