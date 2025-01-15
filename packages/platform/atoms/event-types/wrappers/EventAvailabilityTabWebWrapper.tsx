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
  user?: RouterOutputs["viewer"]["me"];
  teamMembers: TeamMembers;
};

export type GetAllSchedulesByUserIdQueryType =
  typeof trpc.viewer.availability.schedule.getAllSchedulesByUserId.useQuery;

const EventAvailabilityTabWebWrapper = (props: EventAvailabilityTabWebWrapperProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const scheduleId = formMethods.watch("schedule");

  const { isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager({
    eventType: props.eventType,
    translate: t,
    formMethods,
  });

  const { isPending: isSchedulePending, data: scheduleQueryData } =
    trpc.viewer.availability.schedule.get.useQuery(
      {
        scheduleId:
          scheduleId || (!props.isTeamEvent ? props.user?.defaultScheduleId : undefined) || undefined,
        isManagedEventType: isManagedEventType || isChildrenManagedEventType,
      },
      { enabled: !!scheduleId || (!props.isTeamEvent && !!props.user?.defaultScheduleId) }
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
      editAvailabilityRedirectUrl={`/availability/${scheduleQueryData?.id}`}
      hostSchedulesQuery={hostSchedulesQuery}
    />
  );
};

export default EventAvailabilityTabWebWrapper;
