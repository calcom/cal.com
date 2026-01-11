import { useSession } from "next-auth/react";
import { useMemo, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import type { GetUserAvailabilityResult } from "@calcom/features/availability/lib/getUserAvailability";
import type { CalendarEvent } from "@calcom/features/calendars/weeklyview/types/events";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

type UseOnboardingCalendarEventsProps = {
  startDate: Date;
  endDate: Date;
};

const emptyAvailabilityData = {
  busy: [],
  timeZone: "",
  dateRanges: [],
  oooExcludedDateRanges: [],
  workingHours: [],
  dateOverrides: [],
  currentSeats: null,
  datesOutOfOffice: {},
} as GetUserAvailabilityResult;

export const useOnboardingCalendarEvents = ({ startDate, endDate }: UseOnboardingCalendarEventsProps) => {
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  // Watch for calendar installations to refetch events
  const { data: connectedCalendars } = trpc.viewer.calendars.connectedCalendars.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5 seconds to detect new calendar installations
  });

  const { data: busyEvents } = trpc.viewer.availability.user.useQuery(
    {
      username: session?.user?.username || "",
      dateFrom: dayjs(startDate).startOf("day").utc().format(),
      dateTo: dayjs(endDate).endOf("day").utc().format(),
      withSource: true,
    },
    {
      enabled: !!session?.user?.username,
      // Don't show loading state - return empty array immediately
      placeholderData: emptyAvailabilityData,
    }
  );

  // Refetch availability when calendars change
  useEffect(() => {
    if (connectedCalendars?.connectedCalendars) {
      utils.viewer.availability.user.invalidate();
    }
  }, [connectedCalendars?.connectedCalendars?.length, utils.viewer.availability.user]);

  // Format events similar to Troubleshooter
  // Always return an array, never undefined
  const events = useMemo((): CalendarEvent[] => {
    if (!busyEvents?.busy) return [];

    return busyEvents.busy.map((event, idx) => {
      return {
        id: idx,
        title: event.title ?? `Busy`,
        start: new Date(event.start),
        end: new Date(event.end),
        options: {
          color: event.source ? undefined : undefined,
          status: BookingStatus.ACCEPTED,
        },
      };
    });
  }, [busyEvents]);

  return {
    events,
    isLoading: false, // Never show loading state
  };
};
