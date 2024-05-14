import {
  transformAvailabilityForClient,
  transformDateOverridesForClient,
  transformInputCreateSchedule,
  transformWorkingHoursForClient,
} from "@calcom/lib/schedules/client/transformers";
import type { ScheduleOutput } from "@calcom/platform-types";
import type { User } from "@calcom/prisma/client";

export function transformApiScheduleForAtom(
  user: Pick<User, "id" | "defaultScheduleId" | "timeZone"> | undefined,
  schedule: ScheduleOutput | null | undefined,
  userSchedulesCount: number
) {
  if (!user || !schedule) {
    return null;
  }

  const transformedSchedule = transformInputCreateSchedule(schedule);

  const combined = [...transformedSchedule.availability, ...transformedSchedule.overrides];
  const availability = combined.map((entry) => {
    return {
      ...entry,
      userId: schedule.ownerId,
      scheduleId: schedule.id,
      days: "days" in entry ? entry.days : [],
      date: "date" in entry ? entry.date : null,
    };
  });

  const atomSchedule = {
    ...schedule,
    availability,
    userId: schedule.ownerId,
  };

  const timeZone = schedule.timeZone || user.timeZone;
  const defaultScheduleId = user.defaultScheduleId;

  return {
    id: schedule.id,
    name: schedule.name,
    isManaged: schedule.ownerId !== user.id,
    workingHours: transformWorkingHoursForClient(atomSchedule),
    schedule: availability,
    availability: transformAvailabilityForClient(atomSchedule),
    timeZone,
    dateOverrides: transformDateOverridesForClient(atomSchedule, timeZone),
    isDefault: defaultScheduleId === schedule.id,
    isLastSchedule: userSchedulesCount <= 1,
    readOnly: schedule.ownerId !== user.id,
  };
}
