"use client";

import { useRef, useState } from "react";

import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { EventType as EventTypeComponent } from "@calcom/features/eventtypes/components/EventType";
import ManagedEventTypeDialog from "@calcom/features/eventtypes/components/dialogs/ManagedEventDialog";
import type { EventTypeSetupProps, TabMap } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";

import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { useToast } from "../../src/components/ui/use-toast";
import { useAtomsEventTypeById } from "../hooks/useAtomEventTypeById";
import { useAtomUpdateEventType } from "../hooks/useAtomUpdateEventType";
import { useEventTypeForm } from "../hooks/useEventTypeForm";
import { useHandleRouteChange } from "../hooks/useHandleRouteChange";
import { usePlatformTabsNavigations } from "../hooks/usePlatformTabsNavigations";
import SetupTab from "./EventSetupTabPlatformWrapper";

export type PlatformTabs = keyof Omit<TabMap, "workflows" | "webhooks" | "instant" | "ai" | "apps">;

export type EventTypePlatformWrapperProps = {
  id: number;
  tabs?: PlatformTabs[];
};

const EventType = ({
  tabs = ["setup", "availability", "team", "limits", "advanced"],
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
    },
    async onSettled() {
      return;
    },
    onError: (err: Error) => {
      const message = err?.message;
      toast({ description: message ? t(message) : t(err.message) });
    },
  });

  const { form, handleSubmit } = useEventTypeForm({ eventType, onSubmit: updateMutation.mutate });
  const slug = form.watch("slug") ?? eventType.slug;

  const tabMap = {
    setup: tabs.includes("setup") ? (
      <SetupTab
        eventType={eventType}
        locationOptions={locationOptions}
        team={team}
        teamMembers={teamMembers}
        destinationCalendar={destinationCalendar}
      />
    ) : (
      <></>
    ),
    availability: <></>,
    team: <></>,
    limits: <></>,
    advanced: <></>,
    instant: <></>,
    recurring: <></>,
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
    isTeamEventTypeDeleted.current = true;
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
    <AtomsWrapper>
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
                setSlugExistsChildrenDialogOpen([]);
              }}
            />
          ) : null}
        </>
      </EventTypeComponent>
    </AtomsWrapper>
  );
};

export const EventTypePlatformWrapper = ({ id, tabs }: EventTypePlatformWrapperProps) => {
  const { data: eventTypeQueryData } = useAtomsEventTypeById(id);

  if (!eventTypeQueryData) return null;

  return <EventType {...eventTypeQueryData} id={id} tabs={tabs} />;
};
