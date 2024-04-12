"use client";
import { Booker, useEventTypesPublic } from "@calcom/atoms";
import { type Expert } from "~/lib/experts";

type BookerProps = Parameters<typeof Booker>[number];
export const ExpertBooker = (props: { className?: string; expert: Expert } &BookerProps ) => {
  const { isLoading: isLoadingEvents, data: eventTypes } = useEventTypesPublic(
    props.expert.username,
  );
  console.log({ eventTypes });
  return (
    <Booker
      eventSlug="some-event-slug"
      username={props.expert.username}
    />
  );
};
export default ExpertBooker;
