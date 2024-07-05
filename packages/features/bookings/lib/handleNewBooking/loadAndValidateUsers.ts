import type { Prisma } from "@prisma/client";
import type { IncomingMessage } from "http";
import type { Logger } from "tslog";

import { HttpError } from "@calcom/lib/http-error";
import { getPiiFreeUser } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma, { userSelect } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { loadUsers } from "./loadUsers";
import type { NewBookingEventType } from "./types";

type Users = (Awaited<ReturnType<typeof loadUsers>>[number] & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
})[];

type EventType = Pick<NewBookingEventType, "hosts" | "users" | "id" | "userId" | "schedulingType">;

type InputProps = {
  req: IncomingMessage;
  eventType: EventType;
  eventTypeId: number;
  dynamicUserList: string[];
  logger: Logger<unknown>;
};

export async function loadAndValidateUsers({
  req,
  eventType,
  eventTypeId,
  dynamicUserList,
  logger,
}: InputProps): Promise<Users> {
  let users: Users = await loadUsers(eventType, dynamicUserList, req);
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
    const eventTypeUser = await getUserById(eventType.userId, logger);
    if (!eventTypeUser) {
      logger.warn({ message: "NewBooking: eventTypeUser.notFound" });
      throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });
    }
    users.push(eventTypeUser);
  }

  if (!users) throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });

  users = users.map((user) => ({
    ...user,
    isFixed:
      user.isFixed === false
        ? false
        : user.isFixed || eventType.schedulingType !== SchedulingType.ROUND_ROBIN,
  }));

  logger.debug(
    "Concerned users",
    safeStringify({
      users: users.map(getPiiFreeUser),
    })
  );

  return users;
}

// TODO: use repository
async function getUserById(userId: number, logger: Logger<unknown>) {
  const eventTypeUser = await prisma.user.findUnique({
    where: {
      id: userId,
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
  return eventTypeUser;
}
