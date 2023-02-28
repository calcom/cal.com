import type { Prisma, PrismaClient, EventType } from "@prisma/client";
import { isEqual, pick } from "lodash";

import logger from "@calcom/lib/logger";
import { _EventTypeModel } from "@calcom/prisma/zod";

interface handleChildrenEventTypesProps {
  eventTypeId: number;
  updatedEventType: EventType;
  currentUserId: number;
  oldEventType: Prisma.EventTypeGetPayload<{
    where: { id: number };
    select: typeof allManagedEventTypeProps;
  }> | null;
  prisma: PrismaClient<
    Prisma.PrismaClientOptions,
    never,
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
}

// All properties within event type that can and will be updated if needed
export const allManagedEventTypeProps: { [k in keyof Omit<Prisma.EventTypeSelect, "id">]: true } = {
  title: true,
  description: true,
  slug: true,
  length: true,
  locations: true,
  availability: true,
  recurringEvent: true,
  customInputs: true,
  disableGuests: true,
  requiresConfirmation: true,
  eventName: true,
  metadata: true,
  users: true,
  hideCalendarNotes: true,
  minimumBookingNotice: true,
  beforeEventBuffer: true,
  afterEventBuffer: true,
  successRedirectUrl: true,
  seatsPerTimeSlot: true,
  seatsShowAttendees: true,
  periodType: true,
  hashedLink: true,
  webhooks: true,
  periodStartDate: true,
  periodEndDate: true,
  destinationCalendar: true,
  periodCountCalendarDays: true,
  schedulingType: true,
  bookingLimits: true,
  slotInterval: true,
};

// All properties that are defined as locked based on all managed props
export const unlockedManagedEventTypeProps = {
  ...pick(allManagedEventTypeProps, ["locations", "availability", "destinationCalendar"]),
};

export default async function handleChildrenEventTypes({
  eventTypeId: parentId,
  currentUserId,
  oldEventType,
  prisma,
}: handleChildrenEventTypesProps) {
  // Retrieving the updated event type
  const updatedEventType = await prisma.eventType.findFirst({
    where: { id: parentId },
    select: allManagedEventTypeProps,
  });

  // Shortcircuit when no data for old and updated event types
  if (!oldEventType || !updatedEventType) {
    throw new Error("Old or updated event type not found");
  }

  // Define what values are expected to be changed from a managed event type
  const managedEventTypePropsZod = _EventTypeModel.pick(allManagedEventTypeProps as { [k: string]: true });
  const managedEventTypeValues = managedEventTypePropsZod.parse(updatedEventType);

  // Calculate if there are new/deleted users for which the event type needs to be created/deleted
  const oldUserIds = oldEventType.users?.map((user) => user.id).filter((id) => id !== currentUserId);
  const updatedUserIds = updatedEventType.users?.map((user) => user.id);
  const newUsersIds = updatedUserIds?.filter((userId) => !oldUserIds?.includes(userId));
  const deletedUsersIds = oldUserIds?.filter((userId) => !updatedUserIds?.includes(userId));

  // Calculate the difference between old and new data
  const diffEventType = Object.entries(managedEventTypeValues).reduce(
    (diff, [key, value]) =>
      isEqual(oldEventType[key as keyof typeof oldEventType], value) ? diff : { ...diff, [key]: value },
    {} as typeof oldEventType
  );

  logger.debug(
    "handleChildrenEventTypes",
    JSON.stringify([{ diffEventType, newUsersIds, oldUserIds, deletedUsersIds }], null, 2)
  );

  // New users added
  if (newUsersIds?.length) {
    const newEventTypes = await prisma.eventType.createMany({
      data: newUsersIds.map((userId) => ({
        ...managedEventTypeValues,
        bookingLimits:
          (managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
        recurringEvent:
          (managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
        metadata: (managedEventTypeValues.metadata as Prisma.InputJsonValue) ?? undefined,
        userId,
        parentId,
      })),
    });
    logger.debug("handleChildrenEventTypes:newEventTypes", JSON.stringify({ newEventTypes }, null, 2));
  }

  // Old users updated
  if (oldUserIds?.length) {
    const updatedEventTypes = await prisma.eventType.updateMany({
      where: {
        parentId,
      },
      data: {
        ...diffEventType,
        bookingLimits: (diffEventType.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
        recurringEvent: (diffEventType.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
        metadata: (diffEventType.metadata as Prisma.InputJsonValue) ?? undefined,
        locations: (diffEventType.locations as Prisma.InputJsonValue) ?? undefined,
      },
    });
    logger.debug(
      "handleChildrenEventTypes:updatedEventTypes",
      JSON.stringify({ updatedEventTypes }, null, 2)
    );
  }

  // Old users deleted
  if (deletedUsersIds?.length) {
    const deletedEventTypes = await prisma.eventType.deleteMany({
      where: {
        id: {
          in: deletedUsersIds,
        },
        parentId,
      },
    });
    logger.debug(
      "handleChildrenEventTypes:deletedEventTypes",
      JSON.stringify({ deletedEventTypes }, null, 2)
    );
  }
}
