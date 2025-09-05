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
import { Form } from "@calcom/ui/components/form";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";

import { EventTypeSingleLayout } from "./EventTypeLayout";

export type Host = {
  isFixed: boolean;
  userId: number;
  priority: number;
  weight: number;
  scheduleId?: number | null;
  groupId: string | null;
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
  "payments",
] as const;

export type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];
export type EventTypeAssignedUsers = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["children"];
export type EventTypeHosts = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["hosts"];
export type TeamMembers = RouterOutputs["viewer"]["eventTypes"]["get"]["teamMembers"];

export type EventTypeComponentProps = EventTypeSetupProps & {
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
  allowDelete?: boolean;
  saveButtonRef?: React.RefObject<HTMLButtonElement>;
};

export const EventType = ({
  formMethods,
  isPlatform,
  tabName,
  eventType,
  team,
  currentUserMembership,
  tabMap,
  isUpdating,
  isUserOrganizationAdmin,
  onDelete,
  isDeleting,
  tabsNavigation,
  handleSubmit,
  children,
  allowDelete = true,
  saveButtonRef,
}: EventTypeComponentProps) => {
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
        isUserOrganizationAdmin={isUserOrganizationAdmin}
        onDelete={onDelete}
        isDeleting={isDeleting}
        isPlatform={isPlatform}
        allowDelete={allowDelete}
        tabsNavigation={tabsNavigation}
        saveButtonRef={saveButtonRef}>
        <Form form={formMethods} id="event-type-form" handleSubmit={handleSubmit}>
          <div ref={animationParentRef}>{tabMap[tabName]}</div>
        </Form>
      </EventTypeSingleLayout>
      {children}
    </>
  );
};
