"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter as usePageRouter } from "next/router";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import type { NextRouter as NextPageRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";

import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { EventType as EventTypeComponent } from "@calcom/features/eventtypes/components/EventType";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui";

import { useEventTypeForm } from "../hooks/useEventTypeForm";
import { useHandleRouteChange } from "../hooks/useHandleRouteChange";

const ManagedEventTypeDialog = dynamic(
  () => import("@calcom/features/eventtypes/components/dialogs/ManagedEventDialog")
);

const AssignmentWarningDialog = dynamic(
  () => import("@calcom/features/eventtypes/components/dialogs/AssignmentWarningDialog")
);

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

// discriminative factor: isAppDir
type EventTypeAppComponentProp = {
  id: number;
  isAppDir: true;
  pathname: string;
  pageRouter: null;
};

// discriminative factor: isAppDir
type EventTypePageComponentProp = {
  id: number;
  isAppDir: false;
  pageRouter: NextPageRouter;
  pathname: null;
};

type EventTypeAppPageComponentProp = EventTypeAppComponentProp | EventTypePageComponentProp;

export const EventTypeWebWrapper = ({ id, isAppDir }: EventTypeWebWrapperProps & { isAppDir?: boolean }) => {
  const { data: eventTypeQueryData } = trpc.viewer.eventTypes.get.useQuery({ id });

  if (!eventTypeQueryData) return null;

  return isAppDir ? (
    <EventTypeAppWrapper {...eventTypeQueryData} id={id} />
  ) : (
    <EventTypePageWrapper {...eventTypeQueryData} id={id} />
  );
};

const EventTypePageWrapper = ({ id, ...rest }: EventTypeSetupProps & { id: number }) => {
  const router = usePageRouter();
  return <EventTypeWeb {...rest} id={id} isAppDir={false} pageRouter={router} pathname={null} />;
};

const EventTypeAppWrapper = ({ id, ...rest }: EventTypeSetupProps & { id: number }) => {
  const pathname = usePathname();
  return <EventTypeWeb {...rest} id={id} isAppDir={true} pathname={pathname ?? ""} pageRouter={null} />;
};

const EventTypeWeb = ({
  id,
  isAppDir,
  pageRouter,
  pathname,
  ...rest
}: EventTypeSetupProps & EventTypeAppPageComponentProp) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const isTeamEventTypeDeleted = useRef(false);
  const leaveWithoutAssigningHosts = useRef(false);
  const telemetry = useTelemetry();
  const [isOpenAssignmentWarnDialog, setIsOpenAssignmentWarnDialog] = useState<boolean>(false);
  const [pendingRoute, setPendingRoute] = useState("");
  const { eventType, locationOptions, team, teamMembers, destinationCalendar } = rest;
  const [slugExistsChildrenDialogOpen, setSlugExistsChildrenDialogOpen] = useState<ChildrenEventType[]>([]);
  const { data: eventTypeApps } = trpc.viewer.integrations.useQuery({
    extendsFeature: "EventType",
    teamId: eventType.team?.id || eventType.parent?.teamId,
    onlyInstalled: true,
  });
  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async () => {
      const currentValues = form.getValues();

      currentValues.children = currentValues.children.map((child) => ({
        ...child,
        created: true,
      }));
      currentValues.assignAllTeamMembers = currentValues.assignAllTeamMembers || false;

      // Reset the form with these values as new default values to ensure the correct comparison for dirtyFields eval
      form.reset(currentValues);

      showToast(t("event_type_updated_successfully", { eventTypeTitle: eventType.title }), "success");
    },
    async onSettled() {
      await utils.viewer.eventTypes.get.invalidate();
      await utils.viewer.eventTypes.getByViewer.invalidate();
    },
    onError: (err) => {
      let message = "";
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        message = `${err.data.code}: ${t("error_event_type_unauthorized_update")}`;
      }

      if (err.data?.code === "PARSE_ERROR" || err.data?.code === "BAD_REQUEST") {
        message = `${err.data.code}: ${t(err.message)}`;
      }

      if (err.data?.code === "INTERNAL_SERVER_ERROR") {
        message = t("unexpected_error_try_again");
      }

      showToast(message ? t(message) : t(err.message), "error");
    },
  });

  const { form, handleSubmit } = useEventTypeForm({ eventType, onSubmit: updateMutation.mutate });
  const slug = form.watch("slug") ?? eventType.slug;

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
    availability: <EventAvailabilityTab eventType={eventType} isTeamEvent={!!team} />,
    team: <EventTeamAssignmentTab teamMembers={teamMembers} team={team} eventType={eventType} />,
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

  useHandleRouteChange({
    watchTrigger: isAppDir ? pageRouter : pathname,
    isTeamEventTypeDeleted: isTeamEventTypeDeleted.current,
    isleavingWithoutAssigningHosts: leaveWithoutAssigningHosts.current,
    isTeamEventType: !!team,
    assignedUsers: eventType.children,
    hosts: eventType.hosts,
    assignAllTeamMembers: eventType.assignAllTeamMembers,
    isManagedEventType: eventType.schedulingType === SchedulingType.MANAGED,
    onError: (url) => {
      setIsOpenAssignmentWarnDialog(true);
      setPendingRoute(url);
      if (!isAppDir) {
        pageRouter.events.emit(
          "routeChangeError",
          new Error(`Aborted route change to ${url} because none was assigned to team event`)
        );
        throw "Aborted";
      }

      if (isAppDir) throw new Error(`Aborted route change to ${url} because none was assigned to team event`);
    },
    onStart: (handleRouteChange) => {
      !isAppDir && pageRouter.events.on("routeChangeStart", handleRouteChange);
      isAppDir && handleRouteChange(pathname || "");
    },
    onEnd: (handleRouteChange) => {
      !isAppDir && pageRouter.events.off("routeChangeStart", handleRouteChange);
    },
  });

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
        // how to preload with app dir?
        // @ts-expect-error Property 'render' does not exist on type 'ComponentClass
        C.render?.preload();
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const onDelete = () => {
    isTeamEventTypeDeleted.current = true;
  };
  const onConflict = (conflicts: ChildrenEventType[]) => {
    setSlugExistsChildrenDialogOpen(conflicts);
  };
  return (
    <EventTypeComponent
      {...rest}
      allActiveWorkflows={allActiveWorkflows}
      tabMap={tabMap}
      onDelete={onDelete}
      onConflict={onConflict}
      handleSubmit={handleSubmit}
      eventTypeApps={eventTypeApps}
      formMethods={form}
      isUpdating={updateMutation.isPending}>
      <>
        {slugExistsChildrenDialogOpen.length ? (
          <ManagedEventTypeDialog
            slugExistsChildrenDialogOpen={slugExistsChildrenDialogOpen}
            isPending={form.formState.isSubmitting}
            onOpenChange={() => {
              setSlugExistsChildrenDialogOpen([]);
            }}
            slug={slug}
            onConfirm={(e: { preventDefault: () => void }) => {
              e.preventDefault();
              handleSubmit(form.getValues());
              telemetry.event(telemetryEventTypes.slugReplacementAction);
              setSlugExistsChildrenDialogOpen([]);
            }}
          />
        ) : null}
        <AssignmentWarningDialog
          isOpenAssignmentWarnDialog={isOpenAssignmentWarnDialog}
          setIsOpenAssignmentWarnDialog={setIsOpenAssignmentWarnDialog}
          pendingRoute={pendingRoute}
          leaveWithoutAssigningHosts={leaveWithoutAssigningHosts}
          id={eventType.id}
        />
      </>
    </EventTypeComponent>
  );
};
