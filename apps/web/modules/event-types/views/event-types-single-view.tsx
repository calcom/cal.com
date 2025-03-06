"use client";

import { EventTypeWebWrapper as EventType } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";

import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

const EventTypePageWrapper = ({ type, ...rest }: PageProps) => {
  return <EventType {...rest} id={type} />;
};

export default EventTypePageWrapper;
