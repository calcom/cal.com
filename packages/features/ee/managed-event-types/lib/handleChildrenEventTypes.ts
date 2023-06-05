import type { PrismaClient, Prisma } from "@prisma/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { sendSlugReplacementEmail } from "@calcom/emails/email-manager";
import { getTranslation } from "@calcom/lib/server/i18n";
import { SchedulingType } from "@calcom/prisma/enums";
import { _EventTypeModel } from "@calcom/prisma/zod";
import { allManagedEventTypeProps, unlockedManagedEventTypeProps } from "@calcom/prisma/zod-utils";

const generateHashedLink = (id: number) => {
  const translator = short();
  const seed = `${id}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
  return uid;
};

interface handleChildrenEventTypesProps {
  eventTypeId: number;
  updatedEventType: {
    schedulingType: SchedulingType | null;
    slug: string;
  };
  currentUserId: number;
  oldEventType: {
    children?: { userId: number | null }[] | null | undefined;
    team: { name: string } | null;
    workflows?: { workflowId: number }[];
  } | null;
  hashedLink: string | undefined;
  connectedLink: { id: number } | null;
  children:
    | {
        hidden: boolean;
        owner: {
          id: number;
          name: string;
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

const sendAllSlugReplacementEmails = async (
  persons: { email: string; name: string }[],
  slug: string,
  teamName: string | null
) => {
  const t = await getTranslation("en", "common");
  persons.map(
    async (person) =>
      await sendSlugReplacementEmail({ email: person.email, name: person.name, teamName, slug, t })
  );
};

const checkExistentEventTypes = async ({
  updatedEventType,
  children,
  prisma,
  userIds,
  teamName,
}: Pick<handleChildrenEventTypesProps, "updatedEventType" | "children" | "prisma"> & {
  userIds: number[];
  teamName: string | null;
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
      replaceEventType.map((evTy) => evTy.owner),
      updatedEventType.slug,
      teamName
    );

    return deletedReplacedEventTypes;
  }
};

export default async function handleChildrenEventTypes({
  eventTypeId: parentId,
  oldEventType,
  updatedEventType,
  hashedLink,
  connectedLink,
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

  // Calculate if there are new/existent/deleted children users for which the event type needs to be created/updated/deleted
  const previousUserIds = oldEventType.children?.flatMap((ch) => ch.userId ?? []);
  const currentUserIds = children?.map((ch) => ch.owner.id);
  const deletedUserIds = previousUserIds?.filter((id) => !currentUserIds?.includes(id));
  const newUserIds = currentUserIds?.filter((id) => !previousUserIds?.includes(id));
  const oldUserIds = currentUserIds?.filter((id) => previousUserIds?.includes(id));

  // Calculate if there are new workflows for which assigned members will get too
  const currentWorkflowIds = eventType.workflows?.map((wf) => wf.workflowId);

  // Define hashedLink query input
  const hashedLinkQuery = (userId: number) => {
    return hashedLink
      ? !connectedLink
        ? { create: { link: generateHashedLink(userId) } }
        : undefined
      : connectedLink
      ? { delete: true }
      : undefined;
  };

  // Store result for existent event types deletion process
  let deletedExistentEventTypes = undefined;

  // New users added
  if (newUserIds?.length) {
    // Check if there are children with existent homonym event types to send notifications
    deletedExistentEventTypes = await checkExistentEventTypes({
      updatedEventType,
      children,
      prisma,
      userIds: newUserIds,
      teamName: oldEventType.team?.name ?? null,
    });

    // Create event types for new users added
    await prisma.$transaction(
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
            users: {
              connect: [{ id: userId }],
            },
            parentId,
            hidden: children?.find((ch) => ch.owner.id === userId)?.hidden ?? false,
            workflows: currentWorkflowIds && {
              create: currentWorkflowIds.map((wfId) => ({ workflowId: wfId })),
            },
            // Reserved for future releases
            /*
            webhooks: eventType.webhooks && {
              createMany: {
                data: eventType.webhooks?.map((wh) => ({ ...wh, eventTypeId: undefined })),
              },
            },*/
            hashedLink: hashedLinkQuery(userId),
          },
        });
      })
    );
  }

  // Old users updated
  if (oldUserIds?.length) {
    // Check if there are children with existent homonym event types to send notifications
    deletedExistentEventTypes = await checkExistentEventTypes({
      updatedEventType,
      children,
      prisma,
      userIds: oldUserIds,
      teamName: oldEventType.team?.name || null,
    });

    // Update event types for old users
    const oldEventTypes = await prisma.$transaction(
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
            bookingLimits:
              (managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
            recurringEvent:
              (managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
            metadata: (managedEventTypeValues.metadata as Prisma.InputJsonValue) ?? undefined,
            bookingFields: (managedEventTypeValues.bookingFields as Prisma.InputJsonValue) ?? undefined,
            durationLimits: (managedEventTypeValues.durationLimits as Prisma.InputJsonValue) ?? undefined,
            hashedLink: hashedLinkQuery(userId),
          },
        });
      })
    );

    if (currentWorkflowIds?.length) {
      await prisma.$transaction(
        currentWorkflowIds.flatMap((wfId) => {
          return oldEventTypes.map((oEvTy) => {
            return prisma.workflowsOnEventTypes.upsert({
              create: {
                eventTypeId: oEvTy.id,
                workflowId: wfId,
              },
              update: {},
              where: {
                workflowId_eventTypeId: {
                  eventTypeId: oEvTy.id,
                  workflowId: wfId,
                },
              },
            });
          });
        })
      );
    }

    // Reserved for future releases
    /**
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

  return { newUserIds, oldUserIds, deletedUserIds, deletedExistentEventTypes };
}
