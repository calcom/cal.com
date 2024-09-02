"use client";

import { EventType } from "@calcom/features/eventtypes/components/EventType";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";

/* eslint-disable @typescript-eslint/no-empty-function */
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { trpc } from "@calcom/trpc/react";

import type { AppProps } from "@lib/app-providers";
import type { PageProps } from "@lib/event-types/[type]/getServerSideProps";

const EventTypePageWrapper: React.FC<PageProps> & {
  PageWrapper?: AppProps["Component"]["PageWrapper"];
  getLayout?: AppProps["Component"]["getLayout"];
} = (props) => {
  const { data } = trpc.viewer.eventTypes.get.useQuery({ id: props.type });

  if (!data) return null;

  const eventType = data.eventType;

  const { data: workflows } = trpc.viewer.workflows.getAllActiveWorkflows.useQuery({
    eventType: {
      id: props.type,
      teamId: eventType.teamId,
      userId: eventType.userId,
      parent: eventType.parent,
      metadata: eventType.metadata,
    },
  });

  const propsData = {
    ...(data as EventTypeSetupProps),
    allActiveWorkflows: workflows,
  };

  return <EventType {...propsData} />;
};

export default EventTypePageWrapper;
