import type { Prisma, PrismaClient, EventType } from "@prisma/client";
import { isEqual, pick } from "lodash";

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
  bookingLimits: true,
  slotInterval: true,
  scheduleId: true,
  workflows: true,
  bookingFields: true,
};

// All properties that are defined as locked based on all managed props
// Eventually this is going to be just a default and the user can change the config through the UI
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
  const managedEventTypePropsZod = _EventTypeModel.omit(unlockedManagedEventTypeProps);
  const managedEventTypeValues = managedEventTypePropsZod.parse(updatedEventType);

  // Calculate if there are new/deleted users for which the event type needs to be created/deleted
  const oldUserIds = oldEventType.users?.map((user) => user.id).filter((id) => id !== currentUserId);
  const updatedUserIds = updatedEventType.users?.map((user) => user.id);
  const newUsersIds = updatedUserIds?.filter((userId) => !oldUserIds?.includes(userId));

  // Calculate the difference between old and new data
  const diffEventType = Object.entries(managedEventTypeValues).reduce(
    (diff, [key, value]) =>
      isEqual(oldEventType[key as keyof typeof oldEventType], value) ? diff : { ...diff, [key]: value },
    {} as typeof oldEventType
  );

  console.log(
    "handleChildrenEventTypes",
    JSON.stringify([{ diffEventType, newUsersIds, oldUserIds }], null, 2)
  );

  // New users added
  if (newUsersIds?.length) {
    const newEventTypes = await prisma.$transaction(
      newUsersIds.map((userId) => {
        return prisma.eventType.create({
          data: {
            ...managedEventTypeValues,
            bookingLimits:
              (managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
            recurringEvent:
              (managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
            metadata: (managedEventTypeValues.metadata as Prisma.InputJsonValue) ?? undefined,
            bookingFields: (diffEventType.bookingFields as Prisma.InputJsonValue) ?? undefined,
            userId,
            parentId,
            workflows: updatedEventType.workflows && {
              createMany: {
                data: updatedEventType.workflows?.map((wf) => ({ ...wf, eventTypeId: undefined })),
              },
            },
            webhooks: updatedEventType.webhooks && {
              createMany: {
                data: updatedEventType.webhooks?.map((wh) => ({ ...wh, eventTypeId: undefined })),
              },
            },
          },
        });
      })
    );
    console.log("handleChildrenEventTypes:newEventTypes", JSON.stringify({ newEventTypes }, null, 2));
  }

  // Old users updated
  if (oldUserIds?.length) {
    const updatedOldEventTypes = await prisma.eventType.updateMany({
      where: {
        parentId,
      },
      data: {
        ...diffEventType,
        bookingLimits: (diffEventType.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
        recurringEvent: (diffEventType.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
        metadata: (diffEventType.metadata as Prisma.InputJsonValue) ?? undefined,
        locations: (diffEventType.locations as Prisma.InputJsonValue) ?? undefined,
        bookingFields: (diffEventType.bookingFields as Prisma.InputJsonValue) ?? undefined,
      },
    });
    console.log(
      "handleChildrenEventTypes:updatedEventTypes",
      JSON.stringify({ updatedOldEventTypes }, null, 2)
    );
    const updatedOldWorkflows = await prisma.workflow.updateMany({
      where: {
        userId: {
          in: oldUserIds,
        },
      },
      data: {
        ...updatedEventType.workflows,
      },
    });
    console.log(
      "handleChildrenEventTypes:updatedOldWorkflows",
      JSON.stringify({ updatedOldWorkflows }, null, 2)
    );
    const updatedOldWebhooks = await prisma.webhook.updateMany({
      where: {
        userId: {
          in: oldUserIds,
        },
      },
      data: {
        ...updatedEventType.webhooks,
      },
    });
    console.log(
      "handleChildrenEventTypes:updatedOldWebhooks",
      JSON.stringify({ updatedOldWebhooks }, null, 2)
    );
  }

  // Old users deleted
  if (oldUserIds?.length) {
    const deletedEventTypes = await prisma.eventType.deleteMany({
      where: {
        id: {
          in: oldUserIds,
        },
        parentId,
      },
    });
    console.log("handleChildrenEventTypes:deletedEventTypes", JSON.stringify({ deletedEventTypes }, null, 2));
  }
}
