import { useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { TeamMembers } from "@calcom/features/eventtypes/components/EventType";
import { EventAvailabilityTab } from "@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab";
import type { EventTypeSetup, FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

export type EventAvailabilityTabWebWrapperProps = {
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
  user?: RouterOutputs["viewer"]["me"]["get"];
  teamMembers: TeamMembers;
};

export type GetAllSchedulesByUserIdQueryType =
  typeof trpc.viewer.availability.schedule.getAllSchedulesByUserId.useQuery;

const EventAvailabilityTabWebWrapper = (props: EventAvailabilityTabWebWrapperProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const scheduleId = formMethods.watch("schedule");
  const restrictionScheduleId = formMethods.watch("restrictionScheduleId");

  const { isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager({
    eventType: props.eventType,
    translate: t,
    formMethods,
  });

  // Check if team has restriction schedule feature enabled
  const { data: isRestrictionScheduleEnabled = false } = trpc.viewer.features.checkTeamFeature.useQuery(
    {
      teamId: props.eventType.team?.id || 0,
      feature: "restriction-schedule",
    },
    {
      enabled: !!props.eventType.team?.id,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  const { isPending: isSchedulePending, data: scheduleQueryData } =
    trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId:
          scheduleId || (!props.isTeamEvent ? props.user?.defaultScheduleId : undefined) || undefined,
        isManagedEventType: isManagedEventType || isChildrenManagedEventType,
      },
      { enabled: !!scheduleId || (!props.isTeamEvent && !!props.user?.defaultScheduleId) }
    );

  const { isPending: isRestrictionSchedulePending, data: restrictionScheduleQueryData } =
    trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId: restrictionScheduleId || undefined,
        isManagedEventType: isManagedEventType || isChildrenManagedEventType,
      },
      { enabled: !!restrictionScheduleId }
    );

  const { data: schedulesQueryData, isPending: isSchedulesPending } =
    trpc.viewer.availability.list.useQuery(undefined);

  const hostSchedulesQuery = trpc.viewer.availability.schedule.getAllSchedulesByUserId.useQuery;

  return (
    <EventAvailabilityTab
      {...props}
      schedulesQueryData={schedulesQueryData?.schedules}
      isSchedulesPending={isSchedulesPending}
      isSchedulePending={isSchedulePending}
      scheduleQueryData={scheduleQueryData}
      restrictionScheduleQueryData={restrictionScheduleQueryData}
      isRestrictionSchedulePending={isRestrictionSchedulePending}
      editAvailabilityRedirectUrl={`/availability/${scheduleQueryData?.id}`}
      restrictionScheduleRedirectUrl={`/availability/${restrictionScheduleQueryData?.id}`}
      hostSchedulesQuery={hostSchedulesQuery}
      isRestrictionScheduleEnabled={isRestrictionScheduleEnabled}
    />
  );
};

export default EventAvailabilityTabWebWrapper;
