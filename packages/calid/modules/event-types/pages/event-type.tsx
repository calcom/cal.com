"use client";

import { HorizontalTabs, type HorizontalTabItemProps } from "@calid/features/ui/components/navigation";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import dynamic from "next/dynamic";
import { usePathname, useRouter as useAppRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { useEventTypeForm } from "@calcom/atoms/event-types/hooks/useEventTypeForm";
import { useHandleRouteChange } from "@calcom/atoms/event-types/hooks/useHandleRouteChange";
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
import { isManagedEventType } from "../utils/event-types-utils";
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
  { name: "Recurring", icon: "refresh-ccw", href: `${currentPath}?tabName=recurring` },
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
  const resolvedCalIdTeamId = calIdTeamId || (serverFetchedData as any)?.eventType?.calIdTeamId;

  const { data: eventTypeQueryData } = trpc.viewer.eventTypes.calid_get.useQuery(
    { id },
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

  // For CalId, use calIdTeam data if team is not available
  const effectiveTeam = team || (eventType as any).calIdTeam;
  const effectiveTeamMembers = useMemo(() => {
    const members = teamMembers?.length > 0 ? teamMembers : (eventType as any).calIdTeam?.members || [];
    return members.map((member: any) => {
      if (member.user) {
        return member;
      }

      return {
        user: {
          id: member.id,
          name: member.name,
          email: member.email,
          avatar: member.avatar,
          avatarUrl: member.avatarUrl,
          username: member.username,
          locale: member.locale,
          defaultScheduleId: member.defaultScheduleId,
          isPlatformManaged: member.isPlatformManaged,
          timeZone: member.timeZone,
          nonProfileUsername: member.nonProfileUsername,
          profile: member.profile,
          profileId: member.profileId,
          eventTypes: member.eventTypes,
        },
        membership: member.membership,
      };
    });
  }, [teamMembers, eventType]);

  // Ensure users array exists and has at least one user
  if (!eventType.users || eventType.users.length === 0) {
    console.warn("EventType has no users, this may cause issues with URL generation");
  }

  // Helper function to safely get username
  const getEventTypeUsername = () => {
    return eventType.users?.[0]?.username || "unknown";
  };

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
      console.log("Error occured during event type update:", err);
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
    onSubmit: (data) => {
      try {
        console.log("Submitting event type form with data:", data);
        updateMutation.mutate(data);
      } catch (error) {
        throw error;
      }
    },
  });

  let slug;
  try {
    slug = form?.watch("slug") ?? eventType.slug;
  } catch (error) {
    slug = eventType.slug;
  }

  // URL and branding
  const bookerUrl = WEBSITE_URL;

  const permalink = `${bookerUrl}/${
    effectiveTeam && form?.getValues("schedulingType") !== SchedulingType.MANAGED
      ? `team/${effectiveTeam.slug}`
      : getEventTypeUsername()
  }/${slug}`;

  let embedLink;
  try {
    const formUsers = form?.getValues("users");
    const formSlug = form?.getValues("slug");

    embedLink = `${
      effectiveTeam && form?.getValues("schedulingType") !== SchedulingType.MANAGED
        ? `team/${effectiveTeam.slug}`
        : formUsers?.[0]?.username || getEventTypeUsername()
    }/${formSlug || slug}`;
  } catch (error) {
    embedLink = `${
      effectiveTeam && eventType.schedulingType !== SchedulingType.MANAGED
        ? `team/${effectiveTeam.slug}`
        : eventType.users?.[0]?.username || "unknown"
    }/${slug}`;
  }

  // Permissions
  let hasPermsToDelete;
  try {
    const schedulingType = form?.getValues("schedulingType");

    hasPermsToDelete =
      currentUserMembership?.role !== "MEMBER" ||
      !currentUserMembership ||
      schedulingType === SchedulingType.MANAGED;
  } catch (error) {
    hasPermsToDelete = true; // Default to allowing delete if there's an error
  }

  const connectedCalendarsQuery = trpc.viewer.calendars.connectedCalendars.useQuery();

  // Tab content mapping
  const tabMap = {
    setup: (
      <EventSetup
        eventType={eventType}
        locationOptions={locationOptions}
        team={effectiveTeam}
        teamMembers={effectiveTeamMembers}
        destinationCalendar={destinationCalendar}
      />
    ),
    availability: (
      <EventAvailability
        eventType={eventType as any}
        isTeamEvent={!!effectiveTeam}
        user={user}
        teamMembers={effectiveTeamMembers}
      />
    ),
    team: (() => {
      return (
        <EventTeamAssignmentTab
          orgId={null}
          teamMembers={effectiveTeamMembers}
          team={effectiveTeam}
          eventType={eventType}
          isSegmentApplicable={false}
        />
      );
    })(),

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
    embed: <EventEmbed eventId={eventType.id} calLink={embedLink} />,
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
  const allTabs = getTabs(pathname);
  const availableTabs = allTabs.filter((tabItem) => {
    if (tabItem.name === "Team") {
      const shouldShowTeamTab = !!effectiveTeam;
      return shouldShowTeamTab;
    }
    if (tabItem.name === "Embed") {
      return !isManagedEventType(eventType as any);
    }
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
      handleSubmit={handleSubmit}
      eventTypesLockedByOrg={eventTypesLockedByOrg}
      permalink={permalink}
      hasPermsToDelete={hasPermsToDelete}
      isUpdatePending={updateMutation.isPending || !isFormReady}
      onDeleteClick={() => setDeleteDialogOpen(true)}
    />
  );

  // Add defensive check for eventType
  if (!eventType) {
    return <div>Loading...</div>;
  }

  return (
    <Shell
      heading={t("edit_event_title")}
      subtitle={t("edit_event_subtitle")}
      backPath="/event-types"
      CTA={cta}>
      <div className="bg-background min-h-screen px-2 lg:px-0">
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
        <div className="bg-background pb-4">
          <div className="mx-auto max-w-none">
            <Form
              form={form}
              id="event-type-form"
              handleSubmit={(values) => {
                try {
                  handleSubmit(values);
                } catch (error) {
                  throw error;
                }
              }}>
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
