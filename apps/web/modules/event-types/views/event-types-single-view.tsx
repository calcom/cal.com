"use client";

import { EventType } from "@calcom/atoms/monorepo";

import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

const EventTypePageWrapper = (props: PageProps & { isAppDir?: boolean }) => {
  return <EventType {...props} isAppDir={isAppDir} />;
};

export default EventTypePageWrapper;
