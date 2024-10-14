import { useFormContext } from "react-hook-form";

import { EventAvailabilityTab } from "@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab";
import type { EventTypeSetup, FormValues } from "@calcom/features/eventtypes/lib/types";
import type { User } from "@calcom/prisma/client";

import type { Schedule } from "../../availability/AvailabilitySettings";
import { transformApiScheduleForAtom } from "../../availability/atom-api-transformers/transformApiScheduleForAtom";
import { useSchedule } from "../hooks/useSchedule";
import { useSchedules } from "../hooks/useSchedules";

type EventAvailabilityTabPlatformWrapperProps = {
  user?: Pick<User, "id" | "defaultScheduleId" | "timeZone" | "timeFormat" | "weekStart">;
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
};

const EventAvailabilityTabPlatformWrapper = ({
  user,
  ...props
}: EventAvailabilityTabPlatformWrapperProps) => {
  const formMethods = useFormContext<FormValues>();
  const scheduleId = formMethods.watch("schedule");

  const { isLoading: isSchedulePending, data: scheduleQueryData } = useSchedule(
    scheduleId || user?.defaultScheduleId || undefined
  );

  const { data: schedulesQueryData, isLoading: isSchedulesPending } = useSchedules();

  const atomSchedule = transformApiScheduleForAtom(user, scheduleQueryData, schedulesQueryData?.length || 0);

  if (!atomSchedule) {
    return <></>;
  }

  return (
    <EventAvailabilityTab
      {...props}
      user={user}
      schedulesQueryData={schedulesQueryData}
      isSchedulesPending={isSchedulesPending}
      isSchedulePending={isSchedulePending}
      scheduleQueryData={{
        name: atomSchedule?.name,
        isManaged: atomSchedule.isManaged,
        readOnly: atomSchedule.readOnly,
        isDefault: atomSchedule.isDefault,
        id: atomSchedule.id,
        isLastSchedule: atomSchedule.isLastSchedule,
        workingHours: atomSchedule.workingHours,
        dateOverrides: atomSchedule.dateOverrides,
        timeZone: atomSchedule.timeZone,
        availability: atomSchedule.availability,
        schedule:
          atomSchedule.schedule.reduce(
            (acc: Schedule[], avail: Omit<Schedule, "eventTypeId">) => [
              ...acc,
              {
                id: avail.id,
                startTime: new Date(avail.startTime),
                endTime: new Date(avail.endTime),
                userId: avail.userId,
                date: avail.date,
                scheduleId: avail.scheduleId,
                eventTypeId: null,
                days: avail.days,
              },
            ],
            []
          ) || [],
      }}
    />
  );
};

export default EventAvailabilityTabPlatformWrapper;
