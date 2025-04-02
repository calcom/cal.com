"use client";

import { EventTypeWebWrapper as EventType } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";

import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

const EventTypePageWrapper = ({ type, data }: PageProps) => {
  return <EventType data={data} id={type} />;
};

export default EventTypePageWrapper;
