import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getLuckyUser } from "@calcom/lib/server";
import { SchedulingType } from "@calcom/prisma/enums";

import {
  checkUsersAreAvailableInFirstRecurringSlot,
  getDateParams,
} from "./checkUsersAreAvailableInFirstRecurringSlot";
import { ensureAvailableUsers } from "./ensureAvailableUsers";
import type { NewBookingEventType, IsFixedAwareUser, EventTypeWithUsers, Users, BookingType } from "./types";

type InputProps = {
  allRecurringDates: { start: string; end: string }[];
  users: Users;
  eventType: NewBookingEventType;
  numSlotsToCheckForAvailability: number;
  originalRescheduledBooking: BookingType;
  logger: Logger<unknown>;
  isFirstRecurringSlot: boolean;
  reqBodyStart: string;
  reqBodyEnd: string;
  timeZone: string;
  teamMemberEmail?: string;
  reqBodyLuckyUsersIds?: number[];
  isTeamEventType: boolean;
};

const checkUsersAvailabilityWhileBookingFirstSeat = async ({
  allRecurringDates,
  eventType,
  users,
  numSlotsToCheckForAvailability,
  originalRescheduledBooking,
  isFirstRecurringSlot,
  logger,
  teamMemberEmail,
  reqBodyEnd,
  reqBodyStart,
  reqBodyLuckyUsersIds,
  isTeamEventType,
  timeZone,
}: InputProps) => {
  const eventTypeWithUsers: EventTypeWithUsers = enrichEventTypeWithUsers(eventType, users);

  await checkUsersAreAvailableInFirstRecurringSlot({
    allRecurringDates,
    numSlotsToCheckForAvailability,
    isFirstRecurringSlot,
    isTeamEventType,
    eventTypeWithUsers,
    timeZone,
    originalRescheduledBooking,
    logger,
  });

  if (!allRecurringDates || isFirstRecurringSlot) {
    const { updatedUsers, updatedLuckyUserResponse } = await handleInitialRecurringSlotAvailability({
      teamMemberEmail,
      timeZone,
      originalRescheduledBooking,
      reqBodyStart,
      reqBodyEnd,
      logger,
      users,
      eventType,
      isFirstRecurringSlot,
      eventTypeWithUsers,
      allRecurringDates,
    });
    return { updatedUsers, updatedLuckyUserResponse };
  } else if (allRecurringDates && eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
    const { updatedUsers, updatedLuckyUserResponse } = handleSubsequentRecurringSlotAvailability(
      eventTypeWithUsers,
      reqBodyLuckyUsersIds
    );
    return { updatedUsers, updatedLuckyUserResponse };
  }

  return { updatedUsers: null, updatedLuckyUserResponse: null };
};

export default checkUsersAvailabilityWhileBookingFirstSeat;

const handleInitialRecurringSlotAvailability = async ({
  teamMemberEmail,
  timeZone,
  originalRescheduledBooking,
  reqBodyStart,
  reqBodyEnd,
  logger,
  users,
  eventType,
  isFirstRecurringSlot,
  eventTypeWithUsers,
  allRecurringDates,
}: Pick<
  InputProps,
  | "teamMemberEmail"
  | "timeZone"
  | "originalRescheduledBooking"
  | "reqBodyStart"
  | "reqBodyEnd"
  | "logger"
  | "users"
  | "eventType"
  | "isFirstRecurringSlot"
  | "allRecurringDates"
> & { eventTypeWithUsers: EventTypeWithUsers }) => {
  const availableUsers = await ensureAvailableUsers(
    eventTypeWithUsers,
    {
      dateFrom: dayjs(reqBodyStart).tz(timeZone).format(),
      dateTo: dayjs(reqBodyEnd).tz(timeZone).format(),
      timeZone: timeZone,
      originalRescheduledBooking,
    },
    logger
  );

  const { luckyUsers, luckyUserPool, fixedUserPool, notAvailableLuckyUsers } = segregateUsers(
    availableUsers,
    logger
  );

  await assignTeamMemberIfRequested({ luckyUsers, teamMemberEmail, availableUsers, fixedUserPool });

  await assignLuckyUsers({
    isFirstRecurringSlot,
    eventTypeId: eventType.id,
    isRoundRobin: eventType.schedulingType === SchedulingType.ROUND_ROBIN,
    eventTypeWithUsers,
    luckyUsers,
    notAvailableLuckyUsers,
    logger,
    allRecurringDates,
    luckyUserPool,
  });

  // ALL fixed users must be available
  if (fixedUserPool.length !== users.filter((user) => user.isFixed).length) {
    throw new Error(ErrorCode.HostsUnavailableForBooking);
  }

  // Pushing fixed user before the luckyUser guarantees the (first) fixed user as the organizer.
  const updatedUsers = [...fixedUserPool, ...luckyUsers];
  return { updatedUsers, updatedLuckyUserResponse: { luckyUsers: luckyUsers.map((u) => u.id) } };
};

function segregateUsers(availableUsers: IsFixedAwareUser[], logger: Logger<unknown>) {
  const luckyUsers: Users = [];
  const luckyUserPool: IsFixedAwareUser[] = [];
  const fixedUserPool: IsFixedAwareUser[] = [];
  const notAvailableLuckyUsers: Users = [];

  availableUsers.forEach((user) => {
    user.isFixed ? fixedUserPool.push(user) : luckyUserPool.push(user);
  });

  logger.debug(
    "Computed available users",
    safeStringify({
      availableUsers: availableUsers.map((user) => user.id),
      luckyUserPool: luckyUsers.map((user) => user.id),
    })
  );

  return { luckyUsers, luckyUserPool, fixedUserPool, notAvailableLuckyUsers };
}

const assignTeamMemberIfRequested = async ({
  luckyUsers,
  fixedUserPool,
  teamMemberEmail,
  availableUsers,
}: {
  luckyUsers: Users;
  fixedUserPool: IsFixedAwareUser[];
  teamMemberEmail?: string;
  availableUsers: IsFixedAwareUser[];
}) => {
  if (!teamMemberEmail) return;

  const isTeamMemberFixed = fixedUserPool.some((user) => user.email === teamMemberEmail);
  const teamMember = availableUsers.find((user) => user.email === teamMemberEmail);

  // If requested user is not a fixed host, assign the lucky user as the team member
  if (!isTeamMemberFixed && teamMember) {
    luckyUsers.push(teamMember);
  }
};

// Assigns lucky users based on availability
async function assignLuckyUsers({
  isFirstRecurringSlot,
  eventTypeId,
  isRoundRobin,
  eventTypeWithUsers,
  luckyUsers,
  notAvailableLuckyUsers,
  logger,
  allRecurringDates,
  luckyUserPool,
}: Pick<InputProps, "isFirstRecurringSlot" | "logger" | "allRecurringDates"> & {
  eventTypeId: number;
  isRoundRobin: boolean;
  luckyUsers: Users;
  notAvailableLuckyUsers: Users;
  eventTypeWithUsers: EventTypeWithUsers;
  luckyUserPool: IsFixedAwareUser[];
}) {
  // loop through all non-fixed hosts and get the lucky users
  while (luckyUserPool.length > 0 && luckyUsers.length < 1 /* TODO: Add variable */) {
    const allLuckyUserIds = new Set([...luckyUsers, ...notAvailableLuckyUsers].map((user) => user.id));
    const newLuckyUser = await getLuckyUser("MAXIMIZE_AVAILABILITY", {
      availableUsers: luckyUserPool.filter((user) => !allLuckyUserIds.has(user.id)),
      eventTypeId,
    });

    if (!newLuckyUser) break;

    const isFirstRoundRobinRecurringEvent = isFirstRecurringSlot && isRoundRobin;

    if (isFirstRoundRobinRecurringEvent) {
      // for recurring round robin events check if lucky user is available for next slots
      await handleRoundRobinAvailability({
        allRecurringDates,
        eventTypeWithUsers,
        newLuckyUser,
        luckyUsers,
        notAvailableLuckyUsers,
        logger,
      });
    } else {
      luckyUsers.push(newLuckyUser);
    }
  }
}

// Handles round-robin availability checks
async function handleRoundRobinAvailability({
  allRecurringDates,
  numSlotsToCheckForAvailability,
  timeZone,
  eventTypeWithUsers,
  newLuckyUser,
  luckyUsers,
  notAvailableLuckyUsers,
  logger,
  originalRescheduledBooking,
}: Pick<
  InputProps,
  | "numSlotsToCheckForAvailability"
  | "timeZone"
  | "logger"
  | "originalRescheduledBooking"
  | "allRecurringDates"
> & {
  luckyUsers: Users;
  newLuckyUser: IsFixedAwareUser;
  eventTypeWithUsers: EventTypeWithUsers;
  notAvailableLuckyUsers: Users;
}) {
  try {
    const slotsToCheck = Math.min(allRecurringDates.length, numSlotsToCheckForAvailability);

    for (let i = 0; i < slotsToCheck; i++) {
      const { start, end } = allRecurringDates[i];

      await ensureAvailableUsers(
        { ...eventTypeWithUsers, users: [newLuckyUser] },
        getDateParams(start, end, timeZone, originalRescheduledBooking),
        logger
      );
    }
    luckyUsers.push(newLuckyUser);
  } catch {
    notAvailableLuckyUsers.push(newLuckyUser);
    logger.info(
      `Round robin host ${newLuckyUser.name} not available for first two slots. Trying to find another host.`
    );
  }
}

// Handles availability checks for subsequent recurring slots
// all recurring slots except the first one
function handleSubsequentRecurringSlotAvailability(
  eventTypeWithUsers: EventTypeWithUsers,
  reqBodyLuckyUsersIds?: number[]
) {
  const luckyUsersFromFirstBooking = reqBodyLuckyUsersIds
    ? eventTypeWithUsers.users.filter((user) =>
        reqBodyLuckyUsersIds.find((luckyUserId) => luckyUserId === user.id)
      )
    : [];
  const fixedHosts = eventTypeWithUsers.users.filter((user: IsFixedAwareUser) => user.isFixed);
  return { updatedUsers: [...fixedHosts, ...luckyUsersFromFirstBooking], updatedLuckyUserResponse: null };
}

const enrichEventTypeWithUsers = (eventType: NewBookingEventType, users: Users) => {
  return {
    ...eventType,
    users: users as IsFixedAwareUser[],
    ...(eventType.recurringEvent && {
      recurringEvent: {
        ...eventType.recurringEvent,
        count: eventType.recurringEvent.count,
      },
    }),
  };
};
