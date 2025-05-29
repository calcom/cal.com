import { useFormContext } from "react-hook-form";

import type { EventAvailabilityTabCustomClassNames } from "@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab";
import { EventAvailabilityTab } from "@calcom/features/eventtypes/components/tabs/availability/EventAvailabilityTab";
import type { EventTypeSetup, FormValues } from "@calcom/features/eventtypes/lib/types";
import type { User } from "@calcom/prisma/client";

import type { Availability } from "../../availability/AvailabilitySettings";
import { useAtomSchedule } from "../../hooks/schedules/useAtomSchedule";
import { useSchedules } from "../../hooks/schedules/useSchedules";
import { useTeamMembers } from "../../hooks/teams/useTeamMembers";
import { useAtomHostSchedules } from "../hooks/useAtomHostSchedules";

type EventAvailabilityTabPlatformWrapperProps = {
  user?: Pick<User, "id" | "defaultScheduleId" | "timeZone" | "timeFormat" | "weekStart">;
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
  teamId?: number;
  customClassNames?: EventAvailabilityTabCustomClassNames;
};

const EventAvailabilityTabPlatformWrapper = ({
  user,
  teamId,
  ...props
}: EventAvailabilityTabPlatformWrapperProps) => {
  const formMethods = useFormContext<FormValues>();
  const scheduleId = formMethods.watch("schedule");

  const { isLoading: isSchedulePending, data: atomSchedule } = useAtomSchedule(scheduleId?.toString());

  const { data: schedulesQueryData, isLoading: isSchedulesPending } = useSchedules();

  const hostSchedulesQuery = useAtomHostSchedules;
  const { data: teamMembers } = useTeamMembers({ teamId });

  if (!atomSchedule) {
    return <></>;
  }

  return (
    <EventAvailabilityTab
      {...props}
      user={user}
      teamMembers={
        teamMembers?.map((member) => ({
          avatar: member.user.avatarUrl ?? "",
          id: member.userId,
          name: member.user.name,
        })) ?? []
      }
      schedulesQueryData={schedulesQueryData}
      isSchedulesPending={isSchedulesPending}
      isSchedulePending={isSchedulePending}
      hostSchedulesQuery={({ userId }: { userId: number }) => hostSchedulesQuery({ userId, teamId })}
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
