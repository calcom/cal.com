import type { Prisma } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import type { DeepMockProxy } from "vitest-mock-extended";

import { sendSlugReplacementEmail } from "@calcom/emails/email-manager";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { _EventTypeModel } from "@calcom/prisma/zod";
import { allManagedEventTypeProps, unlockedManagedEventTypeProps } from "@calcom/prisma/zod-utils";

interface handleChildrenEventTypesProps {
  eventTypeId: number;
  profileId: number | null;
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
  prisma: PrismaClient | DeepMockProxy<PrismaClient>;
  updatedValues: Prisma.EventTypeUpdateInput;
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
  children,
  prisma,
  profileId,
  updatedValues,
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

  // bookingFields is expected to be filled by the _EventTypeModel but is null at create event
  const _ManagedEventTypeModel = _EventTypeModel.extend({
    bookingFields: _EventTypeModel.shape.bookingFields.nullish(),
  });

  const allManagedEventTypePropsZod = _ManagedEventTypeModel.pick(allManagedEventTypeProps);
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
            profileId: profileId ?? null,
            ...managedEventTypeValues,
            ...unlockedEventTypeValues,
            bookingLimits:
              (managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
            recurringEvent:
              (managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
            metadata: (managedEventTypeValues.metadata as Prisma.InputJsonValue) ?? undefined,
            bookingFields: (managedEventTypeValues.bookingFields as Prisma.InputJsonValue) ?? undefined,
            durationLimits: (managedEventTypeValues.durationLimits as Prisma.InputJsonValue) ?? undefined,
            eventTypeColor: (managedEventTypeValues.eventTypeColor as Prisma.InputJsonValue) ?? undefined,
            onlyShowFirstAvailableSlot: managedEventTypeValues.onlyShowFirstAvailableSlot ?? false,
            userId,
            users: {
              connect: [{ id: userId }],
            },
            parentId,
            hidden: children?.find((ch) => ch.owner.id === userId)?.hidden ?? false,
            workflows: currentWorkflowIds && {
              create: currentWorkflowIds.map((wfId) => ({ workflowId: wfId })),
            },
            /**
             * RR Segment isn't applicable for managed event types.
             */
            rrSegmentQueryValue: undefined,
            assignRRMembersUsingSegment: false,
            useEventLevelSelectedCalendars: false,
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

    const { unlockedFields } = managedEventTypeValues.metadata?.managedEventConfig;
    const unlockedFieldProps = !unlockedFields
      ? {}
      : Object.keys(unlockedFields).reduce((acc, key) => {
          const filteredKey =
            key === "afterBufferTime"
              ? "afterEventBuffer"
              : key === "beforeBufferTime"
              ? "beforeEventBuffer"
              : key;
          // @ts-expect-error Element implicitly has any type
          acc[filteredKey] = true;
          return acc;
        }, {});

    // Add to payload all eventType values that belong to locked fields, changed or unchanged
    // Ignore from payload any eventType values that belong to unlocked fields
    const updatePayload = allManagedEventTypePropsZod.omit(unlockedFieldProps).parse(eventType);
    const updatePayloadFiltered = Object.entries(updatePayload)
      .filter(([key, _]) => key !== "children")
      .reduce((newObj, [key, value]) => ({ ...newObj, [key]: value }), {});
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
            ...updatePayloadFiltered,
            hashedLink:
              "multiplePrivateLinks" in unlockedFieldProps
                ? undefined
                : {
                    deleteMany: {},
                  },
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
