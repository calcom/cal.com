"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";

import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { EventType as EventTypeComponent } from "@calcom/features/eventtypes/components/EventType";
import ManagedEventTypeDialog from "@calcom/features/eventtypes/components/dialogs/ManagedEventDialog";
import type { EventAdvancedTabCustomClassNames } from "@calcom/features/eventtypes/components/tabs/advanced/EventAdvancedTab";
import type { EventTeamAssignmentTabCustomClassNames } from "@calcom/features/eventtypes/components/tabs/assignment/EventTeamAssignmentTab";
import type { EventAvailabilityTabCustomClassNames } from "@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab";
import type { EventLimitsTabCustomClassNames } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import type { EventRecurringTabCustomClassNames } from "@calcom/features/eventtypes/components/tabs/recurring/RecurringEventController";
import type { EventSetupTabCustomClassNames } from "@calcom/features/eventtypes/components/tabs/setup/EventSetupTab";
import type { EventTypeSetupProps, FormValues, TabMap } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";

import { useDeleteEventTypeById } from "../../hooks/event-types/private/useDeleteEventTypeById";
import { useDeleteTeamEventTypeById } from "../../hooks/event-types/private/useDeleteTeamEventTypeById";
import { useMe } from "../../hooks/useMe";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { useToast } from "../../src/components/ui/use-toast";
import { useAtomsEventTypeById, QUERY_KEY as ATOM_EVENT_TYPE_QUERY_KEY } from "../hooks/useAtomEventTypeById";
import { useAtomUpdateEventType } from "../hooks/useAtomUpdateEventType";
import { useEventTypeForm } from "../hooks/useEventTypeForm";
import { useHandleRouteChange } from "../hooks/useHandleRouteChange";
import { usePlatformTabsNavigations } from "../hooks/usePlatformTabsNavigations";
import EventAdvancedPlatformWrapper from "./EventAdvancedPlatformWrapper";
import EventAvailabilityTabPlatformWrapper from "./EventAvailabilityTabPlatformWrapper";
import EventLimitsTabPlatformWrapper from "./EventLimitsTabPlatformWrapper";
import EventPaymentsTabPlatformWrapper from "./EventPaymentsTabPlatformWrapper";
import EventRecurringTabPlatformWrapper from "./EventRecurringTabPlatformWrapper";
import SetupTab from "./EventSetupTabPlatformWrapper";
import EventTeamAssignmentTabPlatformWrapper from "./EventTeamAssignmentTabPlatformWrapper";

export type PlatformTabs = keyof Omit<TabMap, "workflows" | "webhooks" | "instant" | "ai" | "apps">;

export type EventTypeCustomClassNames = {
  atomsWrapper?: string;
  eventSetupTab?: EventSetupTabCustomClassNames;
  eventLimitsTab?: EventLimitsTabCustomClassNames;
  eventAdvancedTab?: EventAdvancedTabCustomClassNames;
  eventAssignmentTab?: EventTeamAssignmentTabCustomClassNames;
  eventRecurringTab?: EventRecurringTabCustomClassNames;
  eventAvailabilityTab?: EventAvailabilityTabCustomClassNames;
};

export type EventTypePlatformWrapperProps = {
  id: number;
  tabs?: PlatformTabs[];
  onSuccess?: (eventType: FormValues) => void;
  onError?: (eventType: FormValues, error: Error) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (msg: string) => void;
  allowDelete: boolean;
  customClassNames?: EventTypeCustomClassNames;
  disableToasts?: boolean;
};

const EventType = ({
  tabs = ["setup", "availability", "team", "limits", "advanced", "recurring", "payments"],
  onSuccess,
  onError,
  onDeleteSuccess,
  onDeleteError,
  id,
  allowDelete = true,
  customClassNames,
  disableToasts = false,
  ...props
}: EventTypeSetupProps & EventTypePlatformWrapperProps) => {
  const { t } = useLocale();
  const { toast } = useToast();
  const isTeamEventTypeDeleted = useRef(false);
  const leaveWithoutAssigningHosts = useRef(false);
  const [isOpenAssignmentWarnDialog, setIsOpenAssignmentWarnDialog] = useState<boolean>(false);
  const [pendingRoute, setPendingRoute] = useState("");
  const { eventType, locationOptions, team, teamMembers, destinationCalendar } = props;
  const [slugExistsChildrenDialogOpen, setSlugExistsChildrenDialogOpen] = useState<ChildrenEventType[]>([]);
  const { data: user, isLoading: isUserLoading } = useMe();

  const handleDeleteSuccess = () => {
    showToast(t("event_type_deleted_successfully"), "success");
    isTeamEventTypeDeleted.current = true;
    setSlugExistsChildrenDialogOpen([]);
    setIsOpenAssignmentWarnDialog(false);
    onDeleteSuccess?.();
  };

  const handleDeleteError = (err: Error) => {
    showToast(err.message, "error");
    onDeleteError?.(err.message);
  };

  const deleteMutation = useDeleteEventTypeById({
    onSuccess: async () => {
      handleDeleteSuccess();
    },
    onError: (err) => {
      handleDeleteError(err);
    },
  });

  const deleteTeamEventTypeMutation = useDeleteTeamEventTypeById({
    onSuccess: async () => {
      handleDeleteSuccess();
    },
    onError: (err) => {
      handleDeleteError(err);
    },
  });

  const updateMutation = useAtomUpdateEventType({
    onSuccess: async () => {
      const currentValues = form.getValues();

      currentValues.children = currentValues.children.map((child) => ({
        ...child,
        created: true,
      }));
      currentValues.assignAllTeamMembers = currentValues.assignAllTeamMembers || false;

      // Reset the form with these values as new default values to ensure the correct comparison for dirtyFields eval
      form.reset(currentValues);
      toast({ description: t("event_type_updated_successfully", { eventTypeTitle: eventType.title }) });
      onSuccess?.(currentValues);
    },
    async onSettled() {
      return;
    },
    onError: (err: Error) => {
      const currentValues = form.getValues();
      const message = err?.message;
      toast({ description: message ? t(message) : t(err.message) });
      onError?.(currentValues, err);
    },
    teamId: team?.id,
  });

  const { form, handleSubmit } = useEventTypeForm({
    eventType,
    onSubmit: (data) => updateMutation.mutate(data),
  });
  const slug = form.watch("slug") ?? eventType.slug;

  const showToast = (message: string, variant: "success" | "warning" | "error") => {
    if (!disableToasts) {
      toast({ description: message });
    }
  };

  const tabMap = {
    setup: tabs.includes("setup") ? (
      <SetupTab
        eventType={eventType}
        locationOptions={locationOptions}
        team={team}
        teamMembers={teamMembers}
        destinationCalendar={destinationCalendar}
        customClassNames={customClassNames?.eventSetupTab}
      />
    ) : (
      <></>
    ),
    availability: tabs.includes("availability") ? (
      <EventAvailabilityTabPlatformWrapper
        eventType={eventType}
        isTeamEvent={!!team}
        user={user?.data}
        teamId={team?.id}
        customClassNames={customClassNames?.eventAvailabilityTab}
      />
    ) : (
      <></>
    ),
    team: tabs.includes("team") ? (
      <EventTeamAssignmentTabPlatformWrapper
        team={team}
        eventType={eventType}
        teamMembers={teamMembers}
        customClassNames={customClassNames?.eventAssignmentTab}
      />
    ) : (
      <></>
    ),
    advanced: tabs.includes("advanced") ? (
      <EventAdvancedPlatformWrapper
        eventType={eventType}
        team={team}
        user={user?.data}
        isUserLoading={isUserLoading}
        showToast={showToast}
        customClassNames={customClassNames?.eventAdvancedTab}
      />
    ) : (
      <></>
    ),
    payments: tabs.includes("payments") ? <EventPaymentsTabPlatformWrapper eventType={eventType} /> : <></>,
    limits: tabs.includes("limits") ? (
      <EventLimitsTabPlatformWrapper
        eventType={eventType}
        customClassNames={customClassNames?.eventLimitsTab}
      />
    ) : (
      <></>
    ),
    instant: <></>,
    recurring: tabs.includes("recurring") ? (
      <EventRecurringTabPlatformWrapper
        eventType={eventType}
        customClassNames={customClassNames?.eventRecurringTab}
      />
    ) : (
      <></>
    ),
    apps: <></>,
    workflows: <></>,
    webhooks: <></>,
    ai: <></>,
  } as const;

  useHandleRouteChange({
    watchTrigger: null,
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
    },
    onStart: () => {
      return;
    },
    onEnd: () => {
      return;
    },
  });

  const onDelete = () => {
    if (allowDelete) {
      isTeamEventTypeDeleted.current = true;
      team?.id
        ? deleteTeamEventTypeMutation.mutate({ eventTypeId: id, teamId: team.id })
        : deleteMutation.mutate(id);
    }
  };

  const onConflict = (conflicts: ChildrenEventType[]) => {
    setSlugExistsChildrenDialogOpen(conflicts);
  };

  const { tabsNavigation, currentTab } = usePlatformTabsNavigations({
    formMethods: form,
    eventType,
    team,
    tabs,
  });
  return (
    <AtomsWrapper customClassName={customClassNames?.atomsWrapper}>
      <EventTypeComponent
        {...props}
        tabMap={tabMap}
        onDelete={onDelete}
        onConflict={onConflict}
        handleSubmit={handleSubmit}
        formMethods={form}
        isUpdating={updateMutation.isPending}
        isPlatform
        tabName={currentTab}
        tabsNavigation={tabsNavigation}
        allowDelete={allowDelete}>
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
                setSlugExistsChildrenDialogOpen([]);
              }}
            />
          ) : null}
        </>
      </EventTypeComponent>
    </AtomsWrapper>
  );
};

export const EventTypePlatformWrapper = ({
  id,
  tabs,
  onSuccess,
  onError,
  onDeleteSuccess,
  onDeleteError,
  allowDelete = true,
  customClassNames,
}: EventTypePlatformWrapperProps) => {
  const { data: eventTypeQueryData } = useAtomsEventTypeById(id);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      if (eventTypeQueryData) {
        // on component unmount or eventTypeId change, reset and invalidate query to get fresh data on next mount
        queryClient.invalidateQueries({
          queryKey: [ATOM_EVENT_TYPE_QUERY_KEY, id],
        });
        queryClient.resetQueries({
          queryKey: [ATOM_EVENT_TYPE_QUERY_KEY, id],
        });
      }
    };
  }, [queryClient, id]);

  if (!eventTypeQueryData) return null;

  return (
    <EventType
      {...eventTypeQueryData}
      id={id}
      tabs={tabs}
      onSuccess={onSuccess}
      onError={onError}
      onDeleteSuccess={onDeleteSuccess}
      onDeleteError={onDeleteError}
      allowDelete={allowDelete}
      customClassNames={customClassNames}
    />
  );
};
