"use client";

import { EventTypeWebWrapper } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";

import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

const EventTypePageWrapper = ({ type, data }: PageProps) => {
  return <EventTypeWebWrapper data={data} id={type} />;
};

export default EventTypePageWrapper;
