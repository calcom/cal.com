import type { PrismaClient, Prisma } from "@prisma/client";
import { SchedulingType } from "@prisma/client";

import { sendSlugReplacementEmail } from "@calcom/emails/email-manager";
import { _EventTypeModel } from "@calcom/prisma/zod";
import { allManagedEventTypeProps, unlockedManagedEventTypeProps } from "@calcom/prisma/zod-utils";

import { getTranslation } from "./server/i18n";

interface handleChildrenEventTypesProps {
  eventTypeId: number;
  updatedEventType: { schedulingType: SchedulingType | null; slug: string };
  currentUserId: number;
  oldEventType: { users?: { id: number }[] | null } | null;
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
  if (updatedEventType?.schedulingType !== SchedulingType.MANAGED)
    return {
      message: "No managed event type",
    };

  // Retrieving the updated event type
  const eventType = await prisma.eventType.findFirst({
    where: { id: parentId },
    select: allManagedEventTypeProps,
  });

  // Shortcircuit when no data for old and updated event types
  if (!oldEventType || !eventType)
    return {
      message: "Missing event type",
    };

  // Define what values are expected to be changed from a managed event type
  const allManagedEventTypePropsZod = _EventTypeModel.pick(allManagedEventTypeProps);
  const managedEventTypeValues = allManagedEventTypePropsZod
    .omit(unlockedManagedEventTypeProps)
    .parse(eventType);

  // Check we are certainly dealing with a managed event type through its metadata
  if (!managedEventTypeValues.metadata?.managedEventConfig)
    return {
      message: "No managed event metadata",
    };

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

  // New users added
  if (newUserIds?.length) {
    // Check if there are children with existent homonym event types to send notifications
    await checkExistentEventTypes({ updatedEventType, children, prisma, userIds: newUserIds });

    // Create event types for new users added
    await prisma.$transaction(
      newUserIds.map((userId) => {
        return prisma.eventType.create({
          data: {
            ...managedEventTypeValues,
            ...unlockedEventTypeValues,
            bookingLimits: managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject,
            recurringEvent: managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue,
            metadata: managedEventTypeValues.metadata as Prisma.InputJsonValue,
            bookingFields: managedEventTypeValues.bookingFields as Prisma.InputJsonValue,
            durationLimits: managedEventTypeValues.durationLimits as Prisma.InputJsonValue,
            userId,
            parentId,
            hidden: children?.find((ch) => ch.owner.id === userId)?.hidden ?? false,
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
  }

  // Old users updated
  if (oldUserIds?.length) {
    // Check if there are children with existent homonym event types to send notifications
    await checkExistentEventTypes({ updatedEventType, children, prisma, userIds: oldUserIds });

    // Update event types for old users
    await prisma.$transaction(
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
            hidden: children?.find((ch) => ch.owner.id === userId)?.hidden ?? false,
            bookingLimits: managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject,
            recurringEvent: managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue,
            metadata: managedEventTypeValues.metadata as Prisma.InputJsonValue,
            bookingFields: managedEventTypeValues.bookingFields as Prisma.InputJsonValue,
            durationLimits: managedEventTypeValues.durationLimits as Prisma.InputJsonValue,
          },
        });
      })
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
    await prisma.eventType.deleteMany({
      where: {
        userId: {
          in: deletedUserIds,
        },
        parentId,
      },
    });
  }

  return { newUserIds, oldUserIds, deletedUserIds };
}
