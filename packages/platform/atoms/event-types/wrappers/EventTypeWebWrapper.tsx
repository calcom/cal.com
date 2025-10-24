"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter as useAppRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { EventType as EventTypeComponent } from "@calcom/features/eventtypes/components/EventType";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { EventPermissionProvider } from "@calcom/features/pbac/client/context/EventPermissionContext";
import { useWorkflowPermission } from "@calcom/features/pbac/client/hooks/useEventPermission";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import { telemetryEventTypes } from "@calcom/lib/telemetry";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamEventTypeCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";

import { TRPCClientError } from "@trpc/react-query";

import { useEventTypeForm } from "../hooks/useEventTypeForm";
import { useHandleRouteChange } from "../hooks/useHandleRouteChange";
import { useTabsNavigations } from "../hooks/useTabsNavigations";

type EventPermissions = {
  eventTypes: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  workflows: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
};

const ManagedEventTypeDialog = dynamic(
  () => import("@calcom/features/eventtypes/components/dialogs/ManagedEventDialog")
);

const AssignmentWarningDialog = dynamic(
  () => import("@calcom/features/eventtypes/components/dialogs/AssignmentWarningDialog")
);

const EventSetupTab = dynamic(() =>
  // import web wrapper when it's ready
  import("./EventSetupTabWebWrapper").then((mod) => mod)
);

const EventAvailabilityTab = dynamic(() =>
  // import web wrapper when it's ready
  import("./EventAvailabilityTabWebWrapper").then((mod) => mod)
);

const EventTeamAssignmentTab = dynamic(() => import("./EventTeamAssignmentTabWebWrapper").then((mod) => mod));

const EventLimitsTab = dynamic(() =>
  // import web wrapper when it's ready
  import("./EventLimitsTabWebWrapper").then((mod) => mod)
);

const EventAdvancedTab = dynamic(() =>
  // import web wrapper when it's ready
  import("./EventAdvancedWebWrapper").then((mod) => mod)
);

const EventInstantTab = dynamic(() =>
  import("@calcom/features/eventtypes/components/tabs/instant/EventInstantTab").then(
    (mod) => mod.EventInstantTab
  )
);

const EventRecurringTab = dynamic(() =>
  // import web wrapper when it's ready
  import("./EventRecurringWebWrapper").then((mod) => mod)
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
  data: RouterOutputs["viewer"]["eventTypes"]["get"];
  permissions?: EventPermissions;
};

export const EventTypeWebWrapper = ({
  id,
  data: serverFetchedData,
  permissions = {
    eventTypes: {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    },
    workflows: {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    },
  },
}: EventTypeWebWrapperProps) => {
  const { data: eventTypeQueryData } = trpc.viewer.eventTypes.get.useQuery(
    { id },
    { enabled: !serverFetchedData }
  );

  if (serverFetchedData) {
    return (
      <EventPermissionProvider initialPermissions={permissions}>
        <EventTypeWeb {...serverFetchedData} id={id} />
      </EventPermissionProvider>
    );
  }

  if (!eventTypeQueryData) return null;

  return (
    <EventPermissionProvider initialPermissions={permissions}>
      <EventTypeWeb {...eventTypeQueryData} id={id} />
    </EventPermissionProvider>
  );
};

const EventTypeWeb = ({
  id,
  ...rest
}: EventTypeSetupProps & {
  id: number;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const pathname = usePathname();
  const appRouter = useAppRouter();
  const { data: user, isPending: isLoggedInUserPending } = useMeQuery();
  const isTeamEventTypeDeleted = useRef(false);
  const leaveWithoutAssigningHosts = useRef(false);
  const telemetry = useTelemetry();
  const [isOpenAssignmentWarnDialog, setIsOpenAssignmentWarnDialog] = useState<boolean>(false);
  const [pendingRoute, setPendingRoute] = useState("");
  const { eventType, locationOptions, team, teamMembers, destinationCalendar } = rest;
  const [slugExistsChildrenDialogOpen, setSlugExistsChildrenDialogOpen] = useState<ChildrenEventType[]>([]);
  const { data: eventTypeApps, isPending: isPendingApps } = trpc.viewer.apps.integrations.useQuery({
    extendsFeature: "EventType",
    teamId: eventType.team?.id || eventType.parent?.teamId,
    onlyInstalled: true,
  });

  // Check workflow permissions
  const { hasPermission: canReadWorkflows } = useWorkflowPermission("canRead");
  const updateMutation = trpc.viewer.eventTypesHeavy.update.useMutation({
    onSuccess: async () => {
      const currentValues = form.getValues();

      currentValues.children = currentValues.children.map((child) => ({
        ...child,
        created: true,
      }));
      currentValues.assignAllTeamMembers = currentValues.assignAllTeamMembers || false;

      // Reset the form with these values as new default values to ensure the correct comparison for dirtyFields eval
      form.reset(currentValues);
      revalidateEventTypeEditPage(eventType.id);
      if (eventType.team?.slug) {
        // When an event-type is updated,
        // guests could still hit a stale cache and see the old page.
        revalidateTeamEventTypeCache({
          teamSlug: eventType.team.slug,
          meetingSlug: eventType.slug,
          orgSlug: eventType.team.parent?.slug ?? null,
        });
      }
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

  const orgBranding = useOrgBranding();

  const bookerUrl = orgBranding ? orgBranding?.fullDomain : WEBSITE_URL;
  const permalink = `${bookerUrl}/${team ? `team/${team.slug}` : eventType.users[0].username}/${
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
    availability: (
      <EventAvailabilityTab
        eventType={eventType}
        isTeamEvent={!!team}
        user={user}
        teamMembers={teamMembers}
      />
    ),
    team: (
      <EventTeamAssignmentTab
        orgId={orgBranding?.id ?? null}
        teamMembers={teamMembers}
        team={team}
        eventType={eventType}
      />
    ),
    limits: <EventLimitsTab eventType={eventType} />,
    advanced: (
      <EventAdvancedTab
        eventType={eventType}
        team={team}
        user={user}
        isUserLoading={isLoggedInUserPending}
        showToast={showToast}
        orgId={orgBranding?.id ?? null}
      />
    ),
    instant: <EventInstantTab eventType={eventType} isTeamEvent={!!team} />,
    recurring: <EventRecurringTab eventType={eventType} />,
    apps: (
      <EventAppsTab
        eventType={{ ...eventType, URL: permalink }}
        eventTypeApps={eventTypeApps}
        isPendingApps={isPendingApps}
      />
    ),
    workflows:
      allActiveWorkflows && canReadWorkflows ? (
        <EventWorkflowsTab eventType={eventType} workflows={allActiveWorkflows} />
      ) : (
        <></>
      ),
    webhooks: <EventWebhooksTab eventType={eventType} />,
    ai: <EventAITab eventType={eventType} isTeamEvent={!!team} />,
  } as const;

  useHandleRouteChange({
    watchTrigger: pathname,
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
      throw new Error(`Aborted route change to ${url} because none was assigned to team event`);
    },
    onStart: (handleRouteChange) => {
      handleRouteChange(pathname || "");
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

  const onConflict = (conflicts: ChildrenEventType[]) => {
    setSlugExistsChildrenDialogOpen(conflicts);
  };

  const querySchema = z.object({
    tabName: z
      .enum([
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
      ])
      .optional()
      .default("setup"),
  });

  const {
    data: { tabName },
  } = useTypedQuery(querySchema);

  const deleteMutation = trpc.viewer.eventTypes.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.eventTypes.invalidate();
      if (team?.slug) {
        // When a team event-type is deleted,
        // guests could still hit a stale cache and see the old page.
        revalidateTeamEventTypeCache({
          teamSlug: team.slug,
          meetingSlug: eventType.slug,
          orgSlug: team.parent?.slug ?? null,
        });
      }
      showToast(t("event_type_deleted_successfully"), "success");
      isTeamEventTypeDeleted.current = true;
      appRouter.push("/event-types");
      setSlugExistsChildrenDialogOpen([]);
      setIsOpenAssignmentWarnDialog(false);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setSlugExistsChildrenDialogOpen([]);
      } else if (err instanceof TRPCClientError) {
        showToast(err.message, "error");
      }
    },
  });

  const { tabsNavigation } = useTabsNavigations({
    formMethods: form,
    eventType,
    team,
    eventTypeApps,
    allActiveWorkflows,
    canReadWorkflows,
  });

  return (
    <EventTypeComponent
      {...rest}
      allActiveWorkflows={allActiveWorkflows}
      tabMap={tabMap}
      onDelete={(id) => {
        deleteMutation.mutate({ id });
      }}
      isDeleting={deleteMutation.isPending}
      onConflict={onConflict}
      handleSubmit={handleSubmit}
      eventTypeApps={eventTypeApps}
      formMethods={form}
      isUpdating={updateMutation.isPending}
      isPlatform={false}
      tabName={tabName}
      tabsNavigation={tabsNavigation}>
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
