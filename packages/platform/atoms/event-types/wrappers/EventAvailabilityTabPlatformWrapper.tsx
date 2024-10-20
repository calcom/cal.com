import { useFormContext } from "react-hook-form";

import { EventAvailabilityTab } from "@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab";
import type { EventTypeSetup, FormValues } from "@calcom/features/eventtypes/lib/types";
import type { User } from "@calcom/prisma/client";

import type { Availability } from "../../availability/AvailabilitySettings";
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
        isManaged: atomSchedule.isManaged,
        readOnly: atomSchedule.readOnly,
        id: atomSchedule.id,
        timeZone: atomSchedule.timeZone,
        schedule:
          atomSchedule.schedule.reduce(
            (acc: Availability[], avail: Availability) => [
              ...acc,
              {
                startTime: new Date(avail.startTime),
                endTime: new Date(avail.endTime),
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
