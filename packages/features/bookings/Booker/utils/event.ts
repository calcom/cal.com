import { shallow } from "zustand/shallow";

import { useSchedule } from "@calcom/features/schedules";
import { trpc } from "@calcom/trpc/react";

import { useTimePreferences } from "../../lib/timePreferences";
import { useBookerStore } from "../store";

interface TUseEvent {
  username?: string;
  eventSlug?: string;
}

/**
 * Wrapper hook around the trpc query that fetches
 * the event curently viewed in the booker. It will get
 * the current event slug and username from the booker store.
 *
 * Using this hook means you only need to use one hook, instead
 * of combining multiple conditional hooks.
 */
export const useEvent = (props?: TUseEvent) => {
  const [username_, eventSlug_] = useBookerStore((state) => [state.username, state.eventSlug], shallow);

  const username = props?.username ?? username_;
  const eventSlug = props?.eventSlug ?? eventSlug_;
  return trpc.viewer.public.event.useQuery(
    { username: username ?? "", eventSlug: eventSlug ?? "" },
    { refetchOnWindowFocus: false, enabled: Boolean(username) && Boolean(eventSlug) }
  );
};

/**
 * Gets schedule for the current event and current month.
 * Gets all values from the booker store.
 *
 * Using this hook means you only need to use one hook, instead
 * of combining multiple conditional hooks.
 *
 * The prefetchNextMonth argument can be used to prefetch two months at once,
 * useful when the user is viewing dates near the end of the month,
 * this way the multi day view will show data of both months.
 */
export const useScheduleForEvent = ({ prefetchNextMonth }: { prefetchNextMonth?: boolean } = {}) => {
  const { timezone } = useTimePreferences();
  const event = useEvent();
  const [username, eventSlug, month] = useBookerStore(
    (state) => [state.username, state.eventSlug, state.month],
    shallow
  );

  return useSchedule({
    username,
    eventSlug,
    eventId: event.data?.id,
    month,
    timezone,
    prefetchNextMonth,
  });
};
