import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";

import { ensureAvailableUsers } from "./ensureAvailableUsers";
import type { IsFixedAwareUser, BookingType, EventTypeWithUsers } from "./types";

type InputProps = {
  allRecurringDates?: { start: string; end: string }[];
  numSlotsToCheckForAvailability: number;
  isFirstRecurringSlot: boolean;
  isTeamEventType: boolean;
  eventTypeWithUsers: EventTypeWithUsers;
  timeZone: string;
  originalRescheduledBooking: BookingType;
  logger: Logger<unknown>;
};

const ensureAllFixedUsersAreAvailable = async (
  fixedUsers: IsFixedAwareUser[],
  eventTypeWithUsers: EventTypeWithUsers,
  dateParams: ReturnType<typeof getDateParams>,
  logger: Logger<unknown>
) => {
  for (const user of fixedUsers) {
    await ensureAvailableUsers({ ...eventTypeWithUsers, users: [user] }, dateParams, logger);
  }
};

export const checkUsersAreAvailableInFirstRecurringSlot = async ({
  allRecurringDates,
  numSlotsToCheckForAvailability,
  isFirstRecurringSlot,
  isTeamEventType,
  eventTypeWithUsers,
  timeZone,
  originalRescheduledBooking,
  logger,
}: InputProps) => {
  if (!(allRecurringDates && isFirstRecurringSlot)) return;

  const fixedUsers = isTeamEventType
    ? eventTypeWithUsers.users.filter((user: IsFixedAwareUser) => user.isFixed)
    : [];

  const slotsToCheck = Math.min(allRecurringDates.length, numSlotsToCheckForAvailability);

  for (let i = 0; i < slotsToCheck; i++) {
    const { start, end } = allRecurringDates[i];
    const dateParams = getDateParams(start, end, timeZone, originalRescheduledBooking);

    if (isTeamEventType) {
      await ensureAllFixedUsersAreAvailable(fixedUsers, eventTypeWithUsers, dateParams, logger);
    } else {
      await ensureAvailableUsers(eventTypeWithUsers, dateParams, logger);
    }
  }
};

export const getDateParams = (
  start: string,
  end: string,
  timeZone: string,
  originalRescheduledBooking: BookingType
) => {
  return {
    dateFrom: dayjs(start).tz(timeZone).format(),
    dateTo: dayjs(end).tz(timeZone).format(),
    timeZone,
    originalRescheduledBooking,
  };
};
