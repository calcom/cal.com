import { shallow } from "zustand/shallow";

import { useSchedule } from "@calcom/features/schedules";
import { trpc } from "@calcom/trpc/react";

import { useTimePreferences } from "../../lib/timePreferences";
import { useBookerStore } from "../store";

export const useEvent = () => {
  const [username, eventSlug, initialized] = useBookerStore(
    (state) => [state.username, state.eventSlug, state.initialized],
    shallow
  );

  return trpc.viewer.public.event.useQuery(
    { username: username ?? "", eventSlug: eventSlug ?? "" },
    { refetchOnWindowFocus: false, enabled: initialized }
  );
};

export const useScheduleForEvent = () => {
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
  });
};
