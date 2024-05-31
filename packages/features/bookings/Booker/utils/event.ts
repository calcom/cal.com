import { usePathname } from "next/navigation";
import { shallow } from "zustand/shallow";

import { useSchedule } from "@calcom/features/schedules";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { trpc } from "@calcom/trpc/react";

import { useTimePreferences } from "../../lib/timePreferences";
import { useBookerStore } from "../store";

export type useEventReturnType = ReturnType<typeof useEvent>;
export type useScheduleForEventReturnType = ReturnType<typeof useScheduleForEvent>;

/**
 * Wrapper hook around the trpc query that fetches
 * the event currently viewed in the booker. It will get
 * the current event slug and username from the booker store.
 *
 * Using this hook means you only need to use one hook, instead
 * of combining multiple conditional hooks.
 */
export const useEvent = () => {
  const [username, eventSlug] = useBookerStore((state) => [state.username, state.eventSlug], shallow);
  const isTeamEvent = useBookerStore((state) => state.isTeamEvent);
  const org = useBookerStore((state) => state.org);

  const event = trpc.viewer.public.event.useQuery(
    {
      username: username ?? "",
      eventSlug: eventSlug ?? "",
      isTeamEvent,
      org: org ?? null,
    },
    { refetchOnWindowFocus: false, enabled: Boolean(username) && Boolean(eventSlug) }
  );

  return {
    data: event?.data,
    isSuccess: event?.isSuccess,
    isError: event?.isError,
    isPending: event?.isPending,
  };
};

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
} = {}) => {
  const { timezone } = useTimePreferences();
  const event = useEvent();
  const [usernameFromStore, eventSlugFromStore, monthFromStore, durationFromStore] = useBookerStore(
    (state) => [state.username, state.eventSlug, state.month, state.selectedDuration],
    shallow
  );

  const searchParams = useCompatSearchParams();
  const rescheduleUid = searchParams?.get("rescheduleUid");

  const pathname = usePathname();

  const isTeam = !!event.data?.team?.parentId;

  const schedule = useSchedule({
    username: usernameFromStore ?? username,
    eventSlug: eventSlugFromStore ?? eventSlug,
    eventId: event.data?.id ?? eventId,
    timezone,
    selectedDate,
    prefetchNextMonth,
    monthCount,
    dayCount,
    rescheduleUid,
    month: monthFromStore ?? month,
    duration: durationFromStore ?? duration,
    isTeamEvent: pathname?.indexOf("/team/") !== -1 || isTeam,
    orgSlug,
  });

  return {
    data: schedule?.data,
    isPending: schedule?.isPending,
    isError: schedule?.isError,
    isSuccess: schedule?.isSuccess,
    isLoading: schedule?.isLoading,
  };
};
