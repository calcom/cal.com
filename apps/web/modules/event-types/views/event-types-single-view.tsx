"use client";

import { EventTypeWebWrapper as EventType } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";

import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

const EventTypePageWrapper = ({ type, eventType }: PageProps) => {
  return <EventType eventType={eventType} id={type} />;
};

export default EventTypePageWrapper;
