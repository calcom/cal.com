import { shallow } from "zustand/shallow";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { trpc } from "@calcom/trpc/react";

export type useEventReturnType = ReturnType<typeof useEvent>;

/**
 * Wrapper hook around the trpc query that fetches
 * the event currently viewed in the booker. It will get
 * the current event slug and username from the booker store.
 *
 * Using this hook means you only need to use one hook, instead
 * of combining multiple conditional hooks.
 */
export const useEvent = (props?: { fromRedirectOfNonOrgLink?: boolean; disabled?: boolean }) => {
  const [username, eventSlug, isTeamEvent, org] = useBookerStoreContext(
    (state) => [state.username, state.eventSlug, state.isTeamEvent, state.org],
    shallow
  );

  const event = trpc.viewer.public.event.useQuery(
    {
      username: username ?? "",
      eventSlug: eventSlug ?? "",
      isTeamEvent,
      org: org ?? null,
      fromRedirectOfNonOrgLink: props?.fromRedirectOfNonOrgLink,
    },
    {
      refetchOnWindowFocus: false,
      enabled: !props?.disabled && Boolean(username) && Boolean(eventSlug),
    }
  );

  return {
    data: event?.data,
    isSuccess: event?.isSuccess,
    isError: event?.isError,
    isPending: event?.isPending,
  };
};
