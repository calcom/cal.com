import type { Prisma, PrismaClient, EventType } from "@prisma/client";
import { SchedulingType } from "@prisma/client";

import { sendSlugReplacementEmail } from "@calcom/emails/email-manager";
import { _EventTypeModel } from "@calcom/prisma/zod";
import { allManagedEventTypeProps, unlockedManagedEventTypeProps } from "@calcom/prisma/zod-utils";

import { getTranslation } from "./server/i18n";

interface handleChildrenEventTypesProps {
  eventTypeId: number;
  updatedEventType: EventType;
  currentUserId: number;
  oldEventType: Prisma.EventTypeGetPayload<{
    where: { id: number };
    select: typeof allManagedEventTypeProps;
  }> | null;
  children:
    | {
        hidden: boolean;
        owner: {
          id: number;
          email: string;
          eventTypeSlugs: string[];
        };
      }[]
    | undefined;
  prisma: PrismaClient<
    Prisma.PrismaClientOptions,
    never,
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
}

const sendAllSlugReplacementEmails = async (emails: string[], slug: string) => {
  const t = await getTranslation("en", "common");
  emails.map(async (email) => await sendSlugReplacementEmail({ email, slug, t }));
};

const checkExistentEventTypes = async ({
  updatedEventType,
  children,
  prisma,
  userIds,
}: Pick<handleChildrenEventTypesProps, "updatedEventType" | "children" | "prisma"> & {
  userIds: number[];
}) => {
  const replaceEventType = children?.filter(
    (ch) => ch.owner.eventTypeSlugs.includes(updatedEventType.slug) && userIds.includes(ch.owner.id)
  );

  // If so, delete their event type with the same slug to proceed to create a managed one
  if (replaceEventType?.length) {
    const deletedReplacedEventTypes = await prisma.eventType.deleteMany({
      where: {
        slug: updatedEventType.slug,
        userId: {
          in: replaceEventType.map((evTy) => evTy.owner.id),
        },
      },
    });

    // Sending notification after deleting
    await sendAllSlugReplacementEmails(
      replaceEventType.map((evTy) => evTy.owner.email),
      updatedEventType.slug
    );
    console.log(
      "handleChildrenEventTypes:deletedReplacedEventTypes",
      JSON.stringify({ replaceEventType, deletedReplacedEventTypes }, null, 2)
    );
  }
};

export default async function handleChildrenEventTypes({
  eventTypeId: parentId,
  oldEventType,
  updatedEventType,
  children,
  prisma,
}: handleChildrenEventTypesProps) {
  // Check we are dealing with a managed event type
  if (updatedEventType?.schedulingType !== SchedulingType.MANAGED) return;

  // Retrieving the updated event type
  const eventType = await prisma.eventType.findFirst({
    where: { id: parentId },
    select: allManagedEventTypeProps,
  });

  // Shortcircuit when no data for old and updated event types
  if (!oldEventType || !eventType) return;

  // Define what values are expected to be changed from a managed event type
  const allManagedEventTypePropsZod = _EventTypeModel.pick(allManagedEventTypeProps);
  const managedEventTypeValues = allManagedEventTypePropsZod
    .omit(unlockedManagedEventTypeProps)
    .parse(eventType);

  // Check we are certainly dealing with a managed event type through its metadata
  if (!managedEventTypeValues.metadata?.managedEventConfig) return;

  // Define the values for unlocked properties to use on creation, not updation
  const unlockedEventTypeValues = allManagedEventTypePropsZod
    .pick(unlockedManagedEventTypeProps)
    .parse(eventType);

  // Calculate if there are new/deleted users for which the event type needs to be created/deleted
  const previousUserIds = oldEventType.users?.map((user) => user.id);
  const currentUserIds = eventType.users?.map((user) => user.id);
  const deletedUserIds = previousUserIds?.filter((id) => !currentUserIds?.includes(id));
  const newUserIds = currentUserIds?.filter((id) => !previousUserIds?.includes(id));
  const oldUserIds = currentUserIds?.filter((id) => previousUserIds?.includes(id));

  console.log(
    "handleChildrenEventTypes",
    JSON.stringify([{ newUserIds, oldUserIds, deletedUserIds }], null, 2)
  );

  // New users added
  if (newUserIds?.length) {
    // Check if there are children with existent homonym event types to send notifications
    await checkExistentEventTypes({ updatedEventType, children, prisma, userIds: newUserIds });

    // Create event types for new users added
    const newEventTypes = await prisma.$transaction(
      newUserIds.map((userId) => {
        return prisma.eventType.create({
          data: {
            ...managedEventTypeValues,
            ...unlockedEventTypeValues,
            bookingLimits:
              (managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
            recurringEvent:
              (managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
            metadata: (managedEventTypeValues.metadata as Prisma.InputJsonValue) ?? undefined,
            bookingFields: (managedEventTypeValues.bookingFields as Prisma.InputJsonValue) ?? undefined,
            durationLimits: (managedEventTypeValues.durationLimits as Prisma.InputJsonValue) ?? undefined,
            userId,
            parentId,
            hidden: children?.find((ch) => ch.owner.id === userId)?.hidden,
            workflows: eventType.workflows && {
              createMany: {
                data: eventType.workflows?.map((wf) => ({ ...wf, eventTypeId: undefined })),
              },
            },
            webhooks: eventType.webhooks && {
              createMany: {
                data: eventType.webhooks?.map((wh) => ({ ...wh, eventTypeId: undefined })),
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
    // Check if there are children with existent homonym event types to send notifications
    await checkExistentEventTypes({ updatedEventType, children, prisma, userIds: oldUserIds });

    // Update event types for old users
    const updatedOldEventTypes = await prisma.$transaction(
      oldUserIds.map((userId) => {
        return prisma.eventType.update({
          where: {
            userId_parentId: {
              userId,
              parentId,
            },
          },
          data: {
            ...managedEventTypeValues,
            hidden: children?.find((ch) => ch.owner.id === userId)?.hidden,
            bookingLimits:
              (managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
            recurringEvent:
              (managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
            metadata: (managedEventTypeValues.metadata as Prisma.InputJsonValue) ?? undefined,
            bookingFields: (managedEventTypeValues.bookingFields as Prisma.InputJsonValue) ?? undefined,
            durationLimits: (managedEventTypeValues.durationLimits as Prisma.InputJsonValue) ?? undefined,
          },
        });
      })
    );

    console.log(
      "handleChildrenEventTypes:updatedEventTypes",
      JSON.stringify({ updatedOldEventTypes }, null, 2)
    );
    // Reserved for v2
    /*const updatedOldWorkflows = await prisma.workflow.updateMany({
      where: {
        userId: {
          in: oldUserIds,
        },
      },
      data: {
        ...eventType.workflows,
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
        ...eventType.webhooks,
      },
    });
    console.log(
      "handleChildrenEventTypes:updatedOldWebhooks",
      JSON.stringify({ updatedOldWebhooks }, null, 2)
    );*/
  }

  // Old users deleted
  if (deletedUserIds?.length) {
    // Delete event types for deleted users
    const deletedEventTypes = await prisma.eventType.deleteMany({
      where: {
        userId: {
          in: deletedUserIds,
        },
        parentId,
      },
    });
    console.log("handleChildrenEventTypes:deletedEventTypes", JSON.stringify({ deletedEventTypes }, null, 2));
  }
}
