"use client";

import { Icon } from "@calid/features/ui/components/icon";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import dynamic from "next/dynamic";
import { usePathname, useRouter as useAppRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useEventTypeForm } from "@calcom/atoms/event-types/hooks/useEventTypeForm";
import { useHandleRouteChange } from "@calcom/atoms/event-types/hooks/useHandleRouteChange";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import Shell from "@calcom/features/shell/Shell";
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
import classNames from "@calcom/ui/classNames";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamEventTypeCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";

import { TRPCClientError } from "@trpc/react-query";

// Import the new actions component
import { EventTypeActions } from "../components/event-types-action";
import { EventTeamAssignmentTab } from "../components/tabs/event-types-team-assignment";

// Dynamic imports for tab components
const ManagedEventTypeDialog = dynamic(
  () => import("@calcom/features/eventtypes/components/dialogs/ManagedEventDialog")
);

const AssignmentWarningDialog = dynamic(
  () => import("@calcom/features/eventtypes/components/dialogs/AssignmentWarningDialog")
);

const DeleteDialog = dynamic(() =>
  import("@calcom/features/eventtypes/components/dialogs/DeleteDialog").then((mod) => mod.DeleteDialog)
);

//Done
const EventSetupTab = dynamic(() =>
  import("../components/tabs/event-types-setup").then((mod) => mod.EventSetup)
);
//Done
const EventAvailabilityTab = dynamic(() =>
  import("../components/tabs/event-types-availability").then((mod) => mod.EventAvailability)
);
// const EventTeamAssignmentTab = dynamic(() =>
//   import("../components/tabs/event-types-setup").then((mod) => mod.EventSetup)
// );

//Done
const EventLimitsTab = dynamic(() =>
  import("../components/tabs/event-types-limit").then((mod) => mod.EventLimits)
);
//Done
const EventAdvancedTab = dynamic(() =>
  import("../components/tabs/event-types-advanced").then((mod) => mod.EventAdvanced)
);
// const EventInstantTab = dynamic(() =>
//   import("../components/tabs/event-types-setup").then((mod) => mod.EventSetup)
// );
//Done
const EventRecurringTab = dynamic(() =>
  import("../components/tabs/event-types-recurring").then((mod) => mod.EventRecurring)
);
//Done
const EventAppsTab = dynamic(() =>
  import("../components/tabs/event-types-apps").then((mod) => mod.EventApps)
);
//Done
const EventWorkflowsTab = dynamic(() =>
  import("../components/tabs/event-types-workflows").then((mod) => mod.EventWorkflows)
);
//Done
const EventWebhooksTab = dynamic(() =>
  import("../components/tabs/event-types-webhook").then((mod) => mod.EventWebhooks)
);
// const EventAITab = dynamic(() =>
//   import("../components/tabs/event-types-setup").then((mod) => mod.EventSetup)
// );

const EventEmbedTab = dynamic(() =>
  import("../components/tabs/event-types-embed").then((mod) => mod.EventEmbed)
);

// Tab configuration
const tabs = [
  { id: "setup", name: "Event Setup", icon: <Icon name="settings" /> },
  { id: "availability", name: "Availability", icon: <Icon name="clock-2" /> },
  { id: "team", name: "Team", icon: <Icon name="users" /> },
  { id: "limits", name: "Limits", icon: <Icon name="shield" /> },
  { id: "advanced", name: "Advanced", icon: <Icon name="zap" /> },
  { id: "apps", name: "Apps", icon: <Icon name="blocks" /> },
  { id: "workflows", name: "Workflows", icon: <Icon name="workflow" /> },
  { id: "webhooks", name: "Webhooks", icon: <Icon name="webhook" /> },
  // { id: "instant", name: "Instant", icon: <Icon name="bell" /> },
  // { id: "recurring", name: "Recurring", icon: <Icon name="refresh-ccw" /> },
  // { id: "ai", name: "AI", icon: <Icon name="sparkles" /> },
  { id: "embed", name: "Embed", icon: <Icon name="clipboard" /> },
] as const;

export type EventTypeWebWrapperProps = {
  id: number;
  data: RouterOutputs["viewer"]["eventTypes"]["get"];
};

export const EventTypeWebWrapper = ({ id, data: serverFetchedData }: EventTypeWebWrapperProps) => {
  const { data: eventTypeQueryData } = trpc.viewer.eventTypes.get.useQuery(
    { id },
    { enabled: !serverFetchedData }
  );

  if (serverFetchedData) {
    return <EventTypeWithNewUI {...serverFetchedData} id={id} />;
  }

  if (!eventTypeQueryData) return null;

  return <EventTypeWithNewUI {...eventTypeQueryData} id={id} />;
};

const EventTypeWithNewUI = ({ id, ...rest }: EventTypeSetupProps & { id: number }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const pathname = usePathname();
  const appRouter = useAppRouter();
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
        "embed",
      ])
      .optional()
      .default("setup"),
  });
  const {
    data: { tabName: tab },
    setQuery,
  } = useTypedQuery(querySchema);
  const { data: user, isPending: isLoggedInUserPending } = useMeQuery();
  const isTeamEventTypeDeleted = useRef(false);
  const leaveWithoutAssigningHosts = useRef(false);
  const telemetry = useTelemetry();
  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  // State management
  const [activeTab, setActiveTab] = useState(tab || "setup");
  const [isOpenAssignmentWarnDialog, setIsOpenAssignmentWarnDialog] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingRoute, setPendingRoute] = useState("");
  const [slugExistsChildrenDialogOpen, setSlugExistsChildrenDialogOpen] = useState<ChildrenEventType[]>([]);

  const { eventType, locationOptions, team, teamMembers, destinationCalendar, currentUserMembership } = rest;
  const eventTypesLockedByOrg = eventType.team?.parent?.organizationSettings?.lockEventTypeCreationForUsers;

  // Data fetching
  const { data: eventTypeApps } = trpc.viewer.apps.integrations.useQuery({
    extendsFeature: "EventType",
    teamId: eventType.team?.id || eventType.parent?.teamId,
    onlyInstalled: true,
  });

  const { data: allActiveWorkflows } = trpc.viewer.workflows.calid_getAllActiveWorkflows.useQuery({
    eventType: {
      id,
      calIdTeamId: eventType.teamId,
      userId: eventType.userId,
      parent: eventType.parent,
      metadata: eventType.metadata,
    },
  });

  // Mutations
  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async () => {
      const currentValues = form.getValues();
      currentValues.children = currentValues.children.map((child) => ({
        ...child,
        created: true,
      }));
      currentValues.assignAllTeamMembers = currentValues.assignAllTeamMembers || false;

      form.reset(currentValues);
      revalidateEventTypeEditPage(eventType.id);
      if (eventType.team?.slug) {
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
        message = `${err.statusCode}: ${err.message}`;
      } else if (err.data?.code === "UNAUTHORIZED") {
        message = `${err.data.code}: ${t("error_event_type_unauthorized_update")}`;
      } else if (err.data?.code === "PARSE_ERROR" || err.data?.code === "BAD_REQUEST") {
        message = `${err.data.code}: ${t(err.message)}`;
      } else if (err.data?.code === "INTERNAL_SERVER_ERROR") {
        message = t("unexpected_error_try_again");
      }
      showToast(message ? t(message) : t(err.message), "error");
    },
  });

  const deleteMutation = trpc.viewer.eventTypes.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.eventTypes.invalidate();
      if (team?.slug) {
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

  // Form handling
  const { form, handleSubmit } = useEventTypeForm({ eventType, onSubmit: updateMutation.mutate });
  const slug = form.watch("slug") ?? eventType.slug;

  // URL and branding
  const orgBranding = useOrgBranding();
  const bookerUrl = orgBranding ? orgBranding?.fullDomain : WEBSITE_URL;
  const permalink = `${bookerUrl}/${team ? `team/${team.slug}` : eventType.users[0].username}/${
    eventType.slug
  }`;
  const embedLink = `${team ? `team/${team.slug}` : form.getValues("users")[0].username}/${form.getValues(
    "slug"
  )}`;

  // Permissions
  const hasPermsToDelete =
    currentUserMembership?.role !== "MEMBER" ||
    !currentUserMembership ||
    form.getValues("schedulingType") === SchedulingType.MANAGED;
  const connectedCalendarsQuery = trpc.viewer.calendars.connectedCalendars.useQuery();

  // Tab content mapping
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
        isSegmentApplicable={!!orgBranding?.id}
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
        calendarsQuery={{
          data: connectedCalendarsQuery.data,
          isPending: connectedCalendarsQuery.isPending,
          error: connectedCalendarsQuery.error,
        }}
        showBookerLayoutSelector={true}
      />
    ),
    instant: <div />,
    // <EventInstantTab eventType={eventType} isTeamEvent={!!team} />
    recurring: <EventRecurringTab eventType={eventType} />,
    apps: <EventAppsTab eventType={{ ...eventType, URL: permalink }} />,
    workflows: allActiveWorkflows ? (
      <EventWorkflowsTab eventType={eventType} workflows={allActiveWorkflows} />
    ) : (
      <></>
    ),
    webhooks: <EventWebhooksTab eventType={eventType} />,
    ai: <div />,
    // <EventAITab eventType={eventType} isTeamEvent={!!team} />
    embed: <EventEmbedTab calLink={embedLink} />,
  } as const;

  // Route change handling
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

  // Conflict handling
  const onConflict = (conflicts: ChildrenEventType[]) => {
    setSlugExistsChildrenDialogOpen(conflicts);
  };

  // Filter tabs based on event type
  const availableTabs = tabs.filter((tabItem) => {
    if (tabItem.id === "team" && !team) return false;
    // if (tabItem.id === "instant" && eventType.schedulingType === SchedulingType.MANAGED) return false;
    // Add more filtering logic as needed
    return true;
  });

  const renderTabContent = () => {
    return tabMap[activeTab as keyof typeof tabMap] || tabMap.setup;
  };

  // Update active tab when URL changes
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab, activeTab]);

  // Create the CTA component
  const cta = (
    <EventTypeActions
      form={form}
      eventTypesLockedByOrg={eventTypesLockedByOrg}
      permalink={permalink}
      hasPermsToDelete={hasPermsToDelete}
      isUpdatePending={updateMutation.isPending}
      onDeleteClick={() => setDeleteDialogOpen(true)}
    />
  );

  return (
    <Shell
      heading={t("edit_event_title")}
      subtitle={t("edit_event_subtitle")}
      backPath="/event-types"
      CTA={cta}>
      <div className="bg-background min-h-screen">
        {/* Horizontal tabs */}
        <div className="bg-background ">
          <nav className="flex" aria-label="Tabs">
            {availableTabs.map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={() => {
                  setQuery("tabName", tabItem.id);
                  // setActiveTab(tabItem.id);
                }}
                className={classNames(
                  "flex items-center space-x-2 whitespace-nowrap border-b-2 px-4 py-4 text-sm font-semibold  transition-colors",
                  activeTab === tabItem.id
                    ? "border-active text-active"
                    : "text-muted hover:text-foreground hover:border-muted-foreground border-transparent"
                )}
                title={tabItem.name}>
                {tabItem.icon}
                <span>{tabItem.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-background py-4">
          <div className="mx-auto max-w-none">
            <Form form={form} id="event-type-form" handleSubmit={handleSubmit}>
              <div ref={animationParentRef}>{renderTabContent()}</div>
            </Form>
          </div>
        </div>

        {/* Dialogs */}
        {slugExistsChildrenDialogOpen.length > 0 && (
          <ManagedEventTypeDialog
            slugExistsChildrenDialogOpen={slugExistsChildrenDialogOpen}
            isPending={form.formState.isSubmitting}
            onOpenChange={() => setSlugExistsChildrenDialogOpen([])}
            slug={slug}
            onConfirm={(e: { preventDefault: () => void }) => {
              e.preventDefault();
              handleSubmit(form.getValues());
              telemetry.event(telemetryEventTypes.slugReplacementAction);
              setSlugExistsChildrenDialogOpen([]);
            }}
          />
        )}

        <AssignmentWarningDialog
          isOpenAssignmentWarnDialog={isOpenAssignmentWarnDialog}
          setIsOpenAssignmentWarnDialog={setIsOpenAssignmentWarnDialog}
          pendingRoute={pendingRoute}
          leaveWithoutAssigningHosts={leaveWithoutAssigningHosts}
          id={eventType.id}
        />

        <DeleteDialog
          eventTypeId={eventType.id}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDelete={() => deleteMutation.mutate({ id: eventType.id })}
          isDeleting={deleteMutation.isPending}
          isManagedEvent={eventType.schedulingType === SchedulingType.MANAGED ? "_managed" : ""}
        />
      </div>
    </Shell>
  );
};
