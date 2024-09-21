"use client";

/* eslint-disable @typescript-eslint/no-empty-function */
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { UseFormReturn } from "react-hook-form";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { z } from "zod";

import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type {
  TabMap,
  EventTypeSetupProps,
  FormValues,
  EventTypeApps,
} from "@calcom/features/eventtypes/lib/types";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Form } from "@calcom/ui";

import { EventTypeSingleLayout } from "./EventTypeLayout";

export type Host = {
  isFixed: boolean;
  userId: number;
  priority: number;
  weight: number;
  weightAdjustment: number;
};

export type CustomInputParsed = typeof customInputSchema._output;

const querySchema = z.object({
  tabName: z
    .enum([
      "setup",
      "availability",
      "apps",
      "limits",
      "instant",
      "recurring",
      "team",
      "advanced",
      "workflows",
      "webhooks",
      "ai",
    ])
    .optional()
    .default("setup"),
});

export type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];
export type EventTypeAssignedUsers = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["children"];
export type EventTypeHosts = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["hosts"];

export const EventType = (
  props: EventTypeSetupProps & {
    allActiveWorkflows?: Workflow[];
    tabMap: TabMap;
    onDelete: () => void;
    onConflict: (eventTypes: ChildrenEventType[]) => void;
    children?: React.ReactNode;
    handleSubmit: (values: FormValues) => void;
    formMethods: UseFormReturn<FormValues>;
    eventTypeApps?: EventTypeApps;
    isUpdating: boolean;
  }
) => {
  const {
    data: { tabName },
  } = useTypedQuery(querySchema);

  const { formMethods, eventTypeApps } = props;
  const { eventType, team, currentUserMembership, tabMap, isUpdating } = props;

  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  const appsMetadata = formMethods.getValues("metadata")?.apps;
  const availability = formMethods.watch("availability");
  let numberOfActiveApps = 0;

  if (appsMetadata) {
    numberOfActiveApps = Object.entries(appsMetadata).filter(
      ([appId, appData]) =>
        eventTypeApps?.items.find((app) => app.slug === appId)?.isInstalled && appData.enabled
    ).length;
  }

  // Optional prerender all tabs after 300 ms on mount

  return (
    <>
      <EventTypeSingleLayout
        enabledAppsNumber={numberOfActiveApps}
        installedAppsNumber={eventTypeApps?.items.length || 0}
        enabledWorkflowsNumber={props.allActiveWorkflows ? props.allActiveWorkflows.length : 0}
        eventType={eventType}
        activeWebhooksNumber={eventType.webhooks.filter((webhook) => webhook.active).length}
        team={team}
        availability={availability}
        isUpdateMutationLoading={isUpdating}
        formMethods={formMethods}
        // disableBorder={tabName === "apps" || tabName === "workflows" || tabName === "webhooks"}
        disableBorder={true}
        currentUserMembership={currentUserMembership}
        bookerUrl={eventType.bookerUrl}
        isUserOrganizationAdmin={props.isUserOrganizationAdmin}
        onDelete={props.onDelete}>
        <Form form={formMethods} id="event-type-form" handleSubmit={props.handleSubmit}>
          <div ref={animationParentRef}>{tabMap[tabName]}</div>
        </Form>
      </EventTypeSingleLayout>
      {props.children}
    </>
  );
};
