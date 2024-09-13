"use client";

import dynamic from "next/dynamic";
import React, { useEffect } from "react";

import { EventType as EventTypeComponent } from "@calcom/features/eventtypes/components/EventType";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";

const EventSetupTab = dynamic(() =>
  // import web wrapper when it's ready
  import("@calcom/features/eventtypes/components/tabs/setup/EventSetupTab").then((mod) => mod.EventSetupTab)
);

const EventAvailabilityTab = dynamic(() =>
  // import web wrapper when it's ready
  import("@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab").then(
    (mod) => mod.EventAvailabilityTab
  )
);

const EventTeamAssignmentTab = dynamic(() =>
  import("@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab").then(
    (mod) => mod.EventTeamAssignmentTab
  )
);

const EventLimitsTab = dynamic(() =>
  // import web wrapper when it's ready
  import("@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab").then(
    (mod) => mod.EventLimitsTab
  )
);

const EventAdvancedTab = dynamic(() =>
  // import web wrapper when it's ready
  import("@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab").then(
    (mod) => mod.EventAdvancedTab
  )
);

const EventInstantTab = dynamic(() =>
  import("@calcom/features/eventtypes/components/tabs/instant/EventInstantTab").then(
    (mod) => mod.EventInstantTab
  )
);

const EventRecurringTab = dynamic(() =>
  // import web wrapper when it's ready
  import("@calcom/features/eventtypes/components/tabs/recurring/EventRecurringTab").then(
    (mod) => mod.EventRecurringTab
  )
);

const EventAppsTab = dynamic(() =>
  import("@calcom/features/eventtypes/components/tabs/apps/EventAppsTab").then((mod) => mod.EventAppsTab)
);

const EventWorkflowsTab = dynamic(
  () => import("@calcom/features/eventtypes/components/tabs/workflows/EventWorkfowsTab")
);

const EventWebhooksTab = dynamic(() =>
  import("@calcom/features/eventtypes/components/tabs/webhooks/EventWebhooksTab").then(
    (mod) => mod.EventWebhooksTab
  )
);

const EventAITab = dynamic(() =>
  import("@calcom/features/eventtypes/components/tabs/ai/EventAITab").then((mod) => mod.EventAITab)
);

export type EventTypeWebWrapperProps = {
  id: number;
  isAppDir?: boolean;
};

const EventType = ({ id, ...rest }: EventTypeSetupProps & { id: number; isAppDir?: boolean }) => {
  const { eventType, locationOptions, team, teamMembers, destinationCalendar } = rest;
  const { data: allActiveWorkflows } = trpc.viewer.workflows.getAllActiveWorkflows.useQuery({
    eventType: {
      id,
      teamId: eventType.teamId,
      userId: eventType.userId,
      parent: eventType.parent,
      metadata: eventType.metadata,
    },
  });

  const permalink = `${WEBSITE_URL}/${team ? `team/${team.slug}` : eventType.users[0].username}/${
    eventType.slug
  }`;
  const tabMap = {
    setup: (
      <EventSetupTab
        eventType={eventType}
        locationOptions={locationOptions}
        team={team}
        teamMembers={teamMembers}
        destinationCalendar={destinationCalendar}
      />
    ),
    //availability: <EventAvailabilityTab eventType={eventType} isTeamEvent={!!team} />,
    //team: <EventTeamAssignmentTab teamMembers={teamMembers} team={team} eventType={eventType} />,
    limits: <EventLimitsTab eventType={eventType} />,
    advanced: <EventAdvancedTab eventType={eventType} team={team} />,
    instant: <EventInstantTab eventType={eventType} isTeamEvent={!!team} />,
    recurring: <EventRecurringTab eventType={eventType} />,
    apps: <EventAppsTab eventType={{ ...eventType, URL: permalink }} />,
    workflows: allActiveWorkflows ? (
      <EventWorkflowsTab eventType={eventType} workflows={allActiveWorkflows} />
    ) : (
      <></>
    ),
    webhooks: <EventWebhooksTab eventType={eventType} />,
    ai: <EventAITab eventType={eventType} isTeamEvent={!!team} />,
  } as const;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const Components = [
        EventSetupTab,
        EventAvailabilityTab,
        EventTeamAssignmentTab,
        EventLimitsTab,
        EventAdvancedTab,
        EventInstantTab,
        EventRecurringTab,
        EventAppsTab,
        EventWorkflowsTab,
        EventWebhooksTab,
      ];

      Components.forEach((C) => {
        // @ts-expect-error Property 'render' does not exist on type 'ComponentClass
        C.render.preload();
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, []);
  return <EventTypeComponent {...rest} allActiveWorkflows={allActiveWorkflows} tabMap={tabMap} />;
};

export const EventTypeWebWrapper = ({ id }: EventTypeWebWrapperProps) => {
  const { data: eventTypeQueryData } = trpc.viewer.eventTypes.get.useQuery({ id });

  if (!eventTypeQueryData) return null;

  return <EventType {...eventTypeQueryData} id={id} isAppDir={isAppDir} />;
};
