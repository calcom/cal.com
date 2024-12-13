import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";

import { useOverlayCalendarStore } from "../OverlayCalendar/store";
import type { UseCalendarsReturnType } from "./useCalendars";
import { useLocalSet } from "./useLocalSet";

export type UseOverlayCalendarReturnType = ReturnType<typeof useOverlayCalendar>;

export const useOverlayCalendar = ({
  connectedCalendars,
  overlayBusyDates,
  onToggleCalendar,
}: Pick<UseCalendarsReturnType, "connectedCalendars" | "overlayBusyDates" | "onToggleCalendar">) => {
  const { set, toggleValue, hasItem } = useLocalSet<{
    credentialId: number;
    externalId: string;
  }>("toggledConnectedCalendars", []);
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
  const { timezone } = useTimePreferences();

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

  useEffect(() => {
    if (connectedCalendars && set.size === 0 && !initalised) {
      connectedCalendars.forEach((item) => {
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
  }, [hasItem, set, initalised]);

  const handleToggleConnectedCalendar = (externalCalendarId: string, credentialId: number) => {
    const calendarsToLoad = toggleValue({
      credentialId: credentialId,
      externalId: externalCalendarId,
    });
    setOverlayBusyDates([]);
    onToggleCalendar(calendarsToLoad);
  };

  return {
    isOpenOverlayContinueModal: continueWithProvider,
    isOpenOverlaySettingsModal: calendarSettingsOverlay,
    handleCloseContinueModal: (val: boolean) => setContinueWithProvider(val),
    handleCloseSettingsModal: (val: boolean) => setCalendarSettingsOverlay(val),
    handleToggleConnectedCalendar,
    checkIsCalendarToggled: (externalId: string, credentialId: number) => {
      return hasItem({
        credentialId: credentialId,
        externalId: externalId,
      });
    },
  };
};
