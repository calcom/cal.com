import { shallow } from "zustand/shallow";

import { useSchedule } from "@calcom/features/schedules";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

import { useBookerTime } from "../components/hooks/useBookerTime";
import { useBookerStore } from "../store";

export type useScheduleForEventReturnType = ReturnType<typeof useScheduleForEvent>;

/**
 * Gets schedule for the current event and current month.
 * Gets all values right away and not the store because it increases network timing, only for the first render.
 * We can read from the store if we want to get the latest values.
 *
 * Using this hook means you only need to use one hook, instead
 * of combining multiple conditional hooks.
 *
 * The prefetchNextMonth argument can be used to prefetch two months at once,
 * useful when the user is viewing dates near the end of the month,
 * this way the multi day view will show data of both months.
 */
export const useScheduleForEvent = ({
  prefetchNextMonth,
  username,
  eventSlug,
  eventId,
  month,
  duration,
  monthCount,
  dayCount,
  selectedDate,
  orgSlug,
  teamMemberEmail,
  isTeamEvent,
}: {
  prefetchNextMonth?: boolean;
  username?: string | null;
  eventSlug?: string | null;
  eventId?: number | null;
  month?: string | null;
  duration?: number | null;
  monthCount?: number;
  dayCount?: number | null;
  selectedDate?: string | null;
  orgSlug?: string;
  teamMemberEmail?: string | null;
  fromRedirectOfNonOrgLink?: boolean;
  isTeamEvent?: boolean;
} = {}) => {
  const { timezone } = useBookerTime();
  const [usernameFromStore, eventSlugFromStore, monthFromStore, durationFromStore] = useBookerStore(
    (state) => [state.username, state.eventSlug, state.month, state.selectedDuration],
    shallow
  );

  const searchParams = useCompatSearchParams();
  const rescheduleUid = searchParams?.get("rescheduleUid");

  const schedule = useSchedule({
    username: usernameFromStore ?? username,
    eventSlug: eventSlugFromStore ?? eventSlug,
    eventId,
    timezone,
    selectedDate,
    prefetchNextMonth,
    monthCount,
    dayCount,
    rescheduleUid,
    month: monthFromStore ?? month,
    duration: durationFromStore ?? duration,
    isTeamEvent,
    orgSlug,
    teamMemberEmail,
  });

  return {
    data: schedule?.data,
    isPending: schedule?.isPending,
    isError: schedule?.isError,
    isSuccess: schedule?.isSuccess,
    isLoading: schedule?.isLoading,
    invalidate: schedule?.invalidate,
  };
};
