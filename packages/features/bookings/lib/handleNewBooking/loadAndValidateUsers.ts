import type { Prisma } from "@prisma/client";
import type { IncomingMessage } from "http";
import type { Logger } from "tslog";

import { findQualifiedHosts } from "@calcom/lib/bookings/findQualifiedHosts";
import { HttpError } from "@calcom/lib/http-error";
import { getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { RoutingFormResponse } from "@calcom/lib/server/getLuckyUser";
import { withSelectedCalendars } from "@calcom/lib/server/repository/user";
import { userSelect } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { loadUsers } from "./loadUsers";
import type { NewBookingEventType } from "./types";

type Users = (Awaited<ReturnType<typeof loadUsers>>[number] & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
  createdAt?: Date;
})[];

type EventType = Pick<
  NewBookingEventType,
  | "hosts"
  | "users"
  | "id"
  | "userId"
  | "schedulingType"
  | "maxLeadThreshold"
  | "team"
  | "assignAllTeamMembers"
  | "assignRRMembersUsingSegment"
  | "rrSegmentQueryValue"
  | "isRRWeightsEnabled"
  | "rescheduleWithSameRoundRobinHost"
>;

type InputProps = {
  req: IncomingMessage;
  eventType: EventType;
  eventTypeId: number;
  dynamicUserList: string[];
  logger: Logger<unknown>;
  routedTeamMemberIds: number[] | null;
  contactOwnerEmail: string | null;
  rescheduleUid: string | null;
  routingFormResponse: RoutingFormResponse | null;
};

export async function loadAndValidateUsers({
  req,
  eventType,
  eventTypeId,
  dynamicUserList,
  logger,
  routedTeamMemberIds,
  contactOwnerEmail,
  rescheduleUid,
  routingFormResponse,
}: InputProps): Promise<{ qualifiedRRUsers: Users; additionalFallbackRRUsers: Users; fixedUsers: Users }> {
  let users: Users = await loadUsers({
    eventType,
    dynamicUserList,
    req,
    routedTeamMemberIds,
    contactOwnerEmail,
  });
  const isDynamicAllowed = !users.some((user) => !user.allowDynamicBooking);
  if (!isDynamicAllowed && !eventTypeId) {
    logger.warn({
      message: "NewBooking: Some of the users in this group do not allow dynamic booking",
    });
    throw new HttpError({
      message: "Some of the users in this group do not allow dynamic booking",
      statusCode: 400,
    });
  }

  // If this event was pre-relationship migration
  // TODO: Establish whether this is dead code.
  if (!users.length && eventType.userId) {
    const eventTypeUser = await prisma.user.findUnique({
      where: {
        id: eventType.userId,
      },
      select: {
        credentials: {
          select: credentialForCalendarServiceSelect,
        }, // Don't leak to client
        ...userSelect.select,
      },
    });
    if (!eventTypeUser) {
      logger.warn({ message: "NewBooking: eventTypeUser.notFound" });
      throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });
    }
    users.push(withSelectedCalendars(eventTypeUser));
  }

  if (!users) throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });
  // map fixed users
  users = users.map((user) => ({
    ...user,
    isFixed:
      user.isFixed === false
        ? false
        : user.isFixed || eventType.schedulingType !== SchedulingType.ROUND_ROBIN,
  }));
  const { qualifiedRRHosts, allFallbackRRHosts, fixedHosts } = await findQualifiedHosts({
    eventType,
    routedTeamMemberIds: routedTeamMemberIds || [],
    rescheduleUid,
    contactOwnerEmail,
    routingFormResponse,
  });

  let qualifiedRRUsers: Users = [];
  let allFallbackRRUsers: Users = [];
  let fixedUsers: Users = [];

  if (qualifiedRRHosts.length) {
    // remove users that are not in the qualified hosts array
    const qualifiedHostIds = new Set(qualifiedRRHosts.map((qualifiedHost) => qualifiedHost.user.id));
    qualifiedRRUsers = users.filter((user) => qualifiedHostIds.has(user.id));
  }

  if (allFallbackRRHosts?.length) {
    const fallbackHostIds = new Set(allFallbackRRHosts.map((fallbackHost) => fallbackHost.user.id));
    allFallbackRRUsers = users.filter((user) => fallbackHostIds.has(user.id));
  }

  if (fixedHosts?.length) {
    const fixedHostIds = new Set(fixedHosts.map((fixedHost) => fixedHost.user.id));
    fixedUsers = users.filter((user) => fixedHostIds.has(user.id));
  }

  logger.debug(
    "Concerned users",
    safeStringify({
      users: users.map(getPiiFreeUser),
    })
  );

  const additionalFallbackRRUsers = allFallbackRRUsers.filter(
    (fallbackUser) => !qualifiedRRUsers.find((qualifiedUser) => qualifiedUser.id === fallbackUser.id)
  );

  return {
    qualifiedRRUsers,
    additionalFallbackRRUsers, // without qualified
    fixedUsers: !qualifiedRRUsers.length && !fixedUsers.length ? users : fixedUsers,
  };
}
