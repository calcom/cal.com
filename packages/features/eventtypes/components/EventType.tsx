"use client";

/* eslint-disable @typescript-eslint/no-empty-function */
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { UseFormReturn } from "react-hook-form";

import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type {
  TabMap,
  EventTypeSetupProps,
  FormValues,
  EventTypeApps,
} from "@calcom/features/eventtypes/lib/types";
import type { customInputSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { VerticalTabItemProps } from "@calcom/ui";
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

const tabs = [
  "setup",
  "availability",
  "team",
  "limits",
  "advanced",
  "instant",
  "recurring",
  "apps",
  "workflows",
  "webhooks",
  "ai",
] as const;

export type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];
export type EventTypeAssignedUsers = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["children"];
export type EventTypeHosts = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["hosts"];

export const EventType = (
  props: EventTypeSetupProps & {
    allActiveWorkflows?: Workflow[];
    tabMap: TabMap;
    onDelete: (id: number) => void;
    isDeleting?: boolean;
    onConflict: (eventTypes: ChildrenEventType[]) => void;
    children?: React.ReactNode;
    handleSubmit: (values: FormValues) => void;
    formMethods: UseFormReturn<FormValues>;
    eventTypeApps?: EventTypeApps;
    isUpdating: boolean;
    isPlatform?: boolean;
    tabName: (typeof tabs)[number];
    tabsNavigation: VerticalTabItemProps[];
  }
) => {
  const { formMethods, isPlatform, tabName } = props;
  const { eventType, team, currentUserMembership, tabMap, isUpdating } = props;

  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <>
      <EventTypeSingleLayout
        eventType={eventType}
        team={team}
        isUpdateMutationLoading={isUpdating}
        formMethods={formMethods}
        // disableBorder={tabName === "apps" || tabName === "workflows" || tabName === "webhooks"}
        disableBorder={true}
        currentUserMembership={currentUserMembership}
        bookerUrl={eventType.bookerUrl}
        isUserOrganizationAdmin={props.isUserOrganizationAdmin}
        onDelete={props.onDelete}
        isDeleting={props.isDeleting}
        isPlatform={isPlatform}
        tabsNavigation={props.tabsNavigation}>
        <Form form={formMethods} id="event-type-form" handleSubmit={props.handleSubmit}>
          <div ref={animationParentRef}>{tabMap[tabName]}</div>
        </Form>
      </EventTypeSingleLayout>
      {props.children}
    </>
  );
};
