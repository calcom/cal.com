"use client";

import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

import EventTypePage from "./event-type-page";

const EventTypePageWrapper = ({ type, data }: PageProps) => {
  return <EventTypePage id={type} data={data} />;
};

export default EventTypePageWrapper;
