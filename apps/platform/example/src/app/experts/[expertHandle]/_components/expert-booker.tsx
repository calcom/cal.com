"use client";
import { Booker, useEventTypesPublic } from "@calcom/atoms";
import { type Expert } from "~/lib/experts";

type BookerProps = Parameters<typeof Booker>[number];
export const ExpertBooker = (
  props: { className?: string; expert: Expert } & BookerProps,
) => {
  const { isLoading: isLoadingEvents, data: eventTypes } = useEventTypesPublic(
    // props.expert.username,
    "jane.doe-cluwyp9yb0001p61n2dkqdmo1-gmail"
  );
  console.log({ eventTypes });
  return eventTypes?.length > 0 ? (
    // <Booker eventSlug="some-event-slug" username={props.expert.username} />
    <Booker eventSlug={eventTypes[0].title} username="jane.doe-cluwyp9yb0001p61n2dkqdmo1-gmail" />
  ) : "No data found";
};
export default ExpertBooker;
