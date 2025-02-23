"use client";

import { EventType } from "@calcom/atoms/monorepo";

import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

const EventTypePageWrapper = ({ type, ...rest }: PageProps) => {
  return <EventType {...rest} id={type} />;
};

export default EventTypePageWrapper;
