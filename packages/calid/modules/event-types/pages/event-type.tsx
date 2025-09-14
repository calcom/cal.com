"use client";

import { HorizontalTabs, type HorizontalTabItemProps } from "@calid/features/ui/components/navigation";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import dynamic from "next/dynamic";
import { usePathname, useRouter as useAppRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useEventTypeForm } from "@calcom/atoms/event-types/hooks/useEventTypeForm";
import { useHandleRouteChange } from "@calcom/atoms/event-types/hooks/useHandleRouteChange";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
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
import { Form } from "@calcom/ui/components/form";
import { revalidateCalIdTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { revalidateEventTypeEditPage } from "@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions";

import { TRPCClientError } from "@trpc/react-query";

// Import the new actions component
import { EventTypeActions } from "../components/event-types-action";
import { EventAdvanced } from "../components/tabs/event-types-advanced";
import { EventApps } from "../components/tabs/event-types-apps";
import { EventAvailability } from "../components/tabs/event-types-availability";
import { EventEmbed } from "../components/tabs/event-types-embed";
import { EventLimits } from "../components/tabs/event-types-limit";
import { EventRecurring } from "../components/tabs/event-types-recurring";
import { EventSetup } from "../components/tabs/event-types-setup";
import { EventTeamAssignmentTab } from "../components/tabs/event-types-team-assignment";
import { EventWebhooks } from "../components/tabs/event-types-webhook";
import { EventWorkflows } from "../components/tabs/event-types-workflows";
import { TabSkeleton } from "./tab-skeleton";

// import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";

type CalIdEventTypeData = RouterOutputs["viewer"]["eventTypes"]["calid_get"];

// Dynamic imports for dialogs only (these can remain dynamic as they're not frequently accessed)
const ManagedEventTypeDialog = dynamic(
  () => import("@calcom/features/eventtypes/components/dialogs/ManagedEventDialog")
);

const AssignmentWarningDialog = dynamic(
  () => import("@calcom/features/eventtypes/components/dialogs/AssignmentWarningDialog")
);

const DeleteDialog = dynamic(() =>
  import("@calcom/features/eventtypes/components/dialogs/DeleteDialog").then((mod) => mod.DeleteDialog)
);

// Tab configuration
const getTabs = (currentPath: string): HorizontalTabItemProps[] => [
  { name: "Event Setup", icon: "settings", href: `${currentPath}?tabName=setup` },
  { name: "Availability", icon: "clock-2", href: `${currentPath}?tabName=availability` },
  { name: "Team", icon: "users", href: `${currentPath}?tabName=team` },
  { name: "Limits", icon: "shield", href: `${currentPath}?tabName=limits` },
  { name: "Advanced", icon: "zap", href: `${currentPath}?tabName=advanced` },
  { name: "Apps", icon: "blocks", href: `${currentPath}?tabName=apps` },
  { name: "Workflows", icon: "workflow", href: `${currentPath}?tabName=workflows` },
  { name: "Webhooks", icon: "webhook", href: `${currentPath}?tabName=webhooks` },
  // { name: "Instant", icon: "bell", href: `${currentPath}?tabName=instant` },
  // { name: "Recurring", icon: "refresh-ccw", href: `${currentPath}?tabName=recurring` },
  // { name: "AI", icon: "sparkles", href: `${currentPath}?tabName=ai` },
  { name: "Embed", icon: "clipboard", href: `${currentPath}?tabName=embed` },
];

export type EventTypeWebWrapperProps = {
  id: number;
  data: CalIdEventTypeData;
  calIdTeamId?: number;
};

export const EventTypeWebWrapper = ({
  id,
  data: serverFetchedData,
  calIdTeamId,
}: EventTypeWebWrapperProps) => {
  // Get calIdTeamId from URL parameters as well
  const searchParams = new URLSearchParams(window.location.search);
  const urlCalIdTeamId = searchParams.get("calIdTeamId");

  const resolvedCalIdTeamId =
    calIdTeamId || (serverFetchedData as CalIdEventTypeData)?.eventType?.calIdTeamId;

  const {
    data: eventTypeQueryData,
    error: eventTypeQueryError,
    isPending,
  } = trpc.viewer.eventTypes.calid_get.useQuery(
    { id, calIdTeamId: resolvedCalIdTeamId || 0 },
    { enabled: !serverFetchedData && !!resolvedCalIdTeamId }
  );

  if (serverFetchedData) {
    return <EventTypeWithNewUI {...(serverFetchedData as CalIdEventTypeData)} id={id} />;
  }

  if (!eventTypeQueryData) {
    return null;
  }

  return <EventTypeWithNewUI {...(eventTypeQueryData as CalIdEventTypeData)} id={id} />;
};

const EventTypeWithNewUI = ({ id, ...rest }: any) => {
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormReady, setIsFormReady] = useState(false);

  const { eventType, locationOptions, team, teamMembers, destinationCalendar, currentUserMembership } = rest;

  // Add defensive check for eventType
  if (!eventType) {
    return <div>Loading...</div>;
  }
  const eventTypesLockedByOrg = (eventType as any).team?.parent?.organizationSettings
    ?.lockEventTypeCreationForUsers;

  // Data fetching
  const { data: _eventTypeApps } = trpc.viewer.apps.calid_integrations.useQuery({
    extendsFeature: "EventType",
    calIdTeamId: eventType.calIdTeamId || eventType.parent?.calIdTeamId,
    onlyInstalled: true,
  });

  const { data: allActiveWorkflows } = trpc.viewer.workflows.calid_getAllActiveWorkflows.useQuery({
    eventType: {
      id,
      calIdTeamId: eventType.calIdTeamId,
      userId: eventType.userId,
      parent: eventType.parent,
      metadata: eventType.metadata,
    },
  });

  // Mutations
  const updateMutation = trpc.viewer.eventTypes.calid_update.useMutation({
    onSuccess: async () => {
      const currentValues = form.getValues();

      currentValues.children = currentValues.children.map((child) => ({
        ...child,
        created: true,
      }));
      currentValues.assignAllTeamMembers = currentValues.assignAllTeamMembers || false;

      form.reset(currentValues);
      revalidateEventTypeEditPage(eventType.id);
      if ((eventType as any).team?.slug) {
        revalidateCalIdTeamDataCache({
          teamSlug: (eventType as any).team.slug,
        });
      }
      triggerToast(t("event_type_updated_successfully", { eventTypeTitle: eventType.title }), "success");
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
      } else if (err.message?.includes("Cannot read properties of undefined")) {
        message = t("form_initialization_error_try_again");
      } else {
        message = err.message || t("unexpected_error_try_again");
      }
      triggerToast(message, "error");
    },
  });

  const deleteMutation = trpc.viewer.eventTypes.calid_delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.eventTypes.invalidate();
      if (team?.slug) {
        revalidateCalIdTeamDataCache({
          teamSlug: team.slug,
        });
      }
      triggerToast(t("event_type_deleted_successfully"), "success");
      isTeamEventTypeDeleted.current = true;
      appRouter.push("/event-types");
      setSlugExistsChildrenDialogOpen([]);
      setIsOpenAssignmentWarnDialog(false);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        triggerToast(message, "error");
        setSlugExistsChildrenDialogOpen([]);
      } else if (err instanceof TRPCClientError) {
        triggerToast(err.message, "error");
      }
    },
  });

  // Form handling - only initialize when eventType is available
  const { form, handleSubmit } = useEventTypeForm({
    eventType,
    onSubmit: updateMutation.mutate,
  });
  const slug = form.watch("slug") ?? eventType.slug;

  // URL and branding
  const orgBranding = useOrgBranding();
  const bookerUrl = orgBranding ? orgBranding?.fullDomain : WEBSITE_URL;
  const embedLink = `${team ? `team/${team.slug}` : eventType.users[0].username}/${eventType.slug}`;
  const permalink = `${bookerUrl}/${embedLink}`;

  // Permissions
  const hasPermsToDelete =
    currentUserMembership?.role !== "MEMBER" ||
    !currentUserMembership ||
    form.getValues("schedulingType") === SchedulingType.MANAGED;
  const connectedCalendarsQuery = trpc.viewer.calendars.connectedCalendars.useQuery();

  // Tab content mapping
  const tabMap = {
    setup: (
      <EventSetup
        eventType={eventType}
        locationOptions={locationOptions}
        team={team}
        teamMembers={teamMembers}
        destinationCalendar={destinationCalendar}
      />
    ),
    availability: (
      <EventAvailability
        eventType={eventType as any}
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

    limits: <EventLimits eventType={eventType as any} />,
    advanced: (
      <EventAdvanced
        eventType={eventType as any}
        team={team}
        user={user}
        isUserLoading={isLoggedInUserPending}
        showToast={triggerToast}
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
    recurring: <EventRecurring eventType={eventType as any} />,
    apps: <EventApps eventType={eventType as any} />,
    workflows: allActiveWorkflows ? (
      <EventWorkflows eventType={eventType as any} workflows={allActiveWorkflows} />
    ) : (
      <></>
    ),
    webhooks: <EventWebhooks eventType={eventType as any} />,
    ai: <div />,
    // <EventAITab eventType={eventType} isTeamEvent={!!team} />
    embed: <EventEmbed calLink={embedLink} />,
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
  const _onConflict = (conflicts: ChildrenEventType[]) => {
    setSlugExistsChildrenDialogOpen(conflicts);
  };

  // Filter tabs based on event type
  const allTabs = getTabs(pathname);
  const availableTabs = allTabs.filter((tabItem) => {
    if (tabItem.name === "Team" && !team) return false;
    return true;
  });

  // Loading skeleton component for initial load
  const LoadingSkeleton = () => <TabSkeleton activeTab={activeTab} />;

  const renderTabContent = () => {
    if (isInitialLoad) {
      return <LoadingSkeleton />;
    }
    const validTab = activeTab as keyof typeof tabMap;
    return tabMap[validTab] || tabMap.setup;
  };

  // Update active tab when URL changes
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab, activeTab]);

  // Handle initial load state
  useEffect(() => {
    if (isInitialLoad) {
      // Set a small delay to ensure all data is loaded
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
        setIsFormReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

  // Set form ready when eventType is available
  useEffect(() => {
    if (eventType && !isFormReady) {
      setIsFormReady(true);
    }
  }, [eventType, isFormReady]);

  // Create the CTA component
  const cta = (
    <EventTypeActions
      form={form}
      eventTypesLockedByOrg={eventTypesLockedByOrg}
      permalink={permalink}
      hasPermsToDelete={hasPermsToDelete}
      isUpdatePending={updateMutation.isPending || !isFormReady}
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
        <HorizontalTabs
          tabs={availableTabs.map((tab) => ({
            ...tab,
            isActive: tab.href.includes(`tabName=${activeTab}`),
            onClick: (name: string) => {
              const tabId = availableTabs.find((t) => t.name === name)?.href.split("tabName=")[1];
              if (tabId) {
                setQuery("tabName", tabId as keyof typeof tabMap);
              }
            },
          }))}
          linkShallow={true}
        />

        {/* Content */}
        <div className="bg-background py-4">
          <div className="mx-auto max-w-none">
            <Form form={form} id="event-type-form" handleSubmit={handleSubmit}>
              <div
                ref={animationParentRef}
                className="transition-all duration-200 ease-in-out"
                key={activeTab} // Force re-render for smooth transitions
              >
                {renderTabContent()}
              </div>
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
