import type { DeepMockProxy } from "vitest-mock-extended";

import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { sendSlugReplacementEmail } from "@calcom/emails/integration-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { allManagedEventTypeProps, unlockedManagedEventTypeProps } from "@calcom/prisma/zod-utils";
import { EventTypeSchema } from "@calcom/prisma/zod/modelSchema/EventTypeSchema";

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

function connectUsersToEventTypesQueryWithParams(
  eventPairs: {
    userId: number | null;
    id: number;
  }[]
): { sqlQuery: string; parameters: (number | string)[] } {
  if (eventPairs.length === 0) {
    throw new Error("No event pairs provided for bulk connection.");
  }

  // Array to hold the SQL placeholders: ($1, $2), ($3, $4), ...
  const valuePlaceholders: string[] = [];

  // Flat array of all IDs to be inserted as raw SQL parameters
  const parameters: (number | string)[] = [];

  let paramIndex = 1;

  // --- Build the parameterized SQL values ---
  for (const pair of eventPairs) {
    // Construct the pair of placeholders for the current row
    valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++})`);

    if (pair.userId != null) {
      parameters.push(pair.id);
      parameters.push(pair.userId);
    }
  }

  const sqlQuery = `
        INSERT INTO "_user_eventtype" ("A", "B") 
        VALUES 
        ${valuePlaceholders.join(",\n")}
        ON CONFLICT DO NOTHING;
    `;

  // sqlQuery and its parameters for execution
  return { sqlQuery, parameters };
}

export default async function handleChildrenEventTypes({
  eventTypeId: parentId,
  oldEventType,
  updatedEventType,
  children,
  prisma,
  profileId,
  updatedValues: _updatedValues,
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
  const _ManagedEventTypeModel = EventTypeSchema.extend({
    bookingFields: EventTypeSchema.shape.bookingFields.nullish(),
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
    const eventTypesToCreateData = newUserIds.map((userId) => {
      // Exclude profileId and instantMeetingScheduleId from managed values to avoid duplication
      const {
        profileId: _,
        instantMeetingScheduleId: __,
        ...managedValuesWithoutExplicit
      } = managedEventTypeValues;

      return {
        instantMeetingScheduleId: eventType.instantMeetingScheduleId ?? undefined,
        profileId: profileId ?? null,
        ...managedValuesWithoutExplicit,
        ...{
          ...unlockedEventTypeValues,
          // pre-genned as allowed null
          locations: Array.isArray(unlockedEventTypeValues.locations)
            ? unlockedEventTypeValues.locations
            : undefined,
        },
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
        parentId,
        hidden: children?.find((ch) => ch.owner.id === userId)?.hidden ?? false,
        /**
         * RR Segment isn't applicable for managed event types.
         */
        rrSegmentQueryValue: undefined,
        assignRRMembersUsingSegment: false,
        useEventLevelSelectedCalendars: false,
        restrictionScheduleId: null,
        useBookerTimezone: false,
        allowReschedulingCancelledBookings:
          managedEventTypeValues.allowReschedulingCancelledBookings ?? false,
        rrHostSubsetEnabled: false,
      };
    });

    await prisma.$transaction(async (tx) => {
      const createdEvents = await tx.eventType.createManyAndReturn({
        data: eventTypesToCreateData,
        skipDuplicates: true,
        select: { id: true, userId: true },
      });

      // Connect users to their event types (many-to-many relation)
      // This is needed because createMany doesn't support nested relations
      if (createdEvents.length) {
        const bulkQueryAndParams = connectUsersToEventTypesQueryWithParams(createdEvents);
        if (bulkQueryAndParams) {
          await tx.$executeRawUnsafe(bulkQueryAndParams.sqlQuery, ...bulkQueryAndParams.parameters);
        }
      }

      // Link workflows if any exist
      if (currentWorkflowIds && currentWorkflowIds.length > 0) {
        const workflowConnections = createdEvents.flatMap((event) =>
          currentWorkflowIds.map((wfId) => ({
            eventTypeId: event.id,
            workflowId: wfId,
          }))
        );

        await tx.workflowsOnEventTypes.createMany({
          data: workflowConnections,
          skipDuplicates: true,
        });
      }
    });
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

    const { unlockedFields } = managedEventTypeValues.metadata?.managedEventConfig ?? {};
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
    const oldEventTypes = await Promise.all(
      oldUserIds.map(async (userId) => {
        const existingEventType = await prisma.eventType.findUnique({
          where: {
            userId_parentId: {
              userId,
              parentId,
            },
          },
          select: {
            metadata: true,
          },
        });

        const metadata = eventTypeMetaDataSchemaWithTypedApps.parse(existingEventType?.metadata || {});

        return await prisma.eventType.update({
          where: {
            userId_parentId: {
              userId,
              parentId,
            },
          },
          data: {
            ...updatePayloadFiltered,
            rrHostSubsetEnabled: false,
            hidden: children?.find((ch) => ch.owner.id === userId)?.hidden ?? false,
            ...("schedule" in unlockedFieldProps ? {} : { scheduleId: eventType.scheduleId || null }),
            restrictionScheduleId: null,
            useBookerTimezone: false,
            hashedLink:
              "multiplePrivateLinks" in unlockedFieldProps
                ? undefined
                : {
                    deleteMany: {},
                  },
            allowReschedulingCancelledBookings:
              managedEventTypeValues.allowReschedulingCancelledBookings ?? false,
            metadata: {
              ...(eventType.metadata as Prisma.JsonObject),
              ...(metadata?.multipleDuration && "length" in unlockedFieldProps
                ? { multipleDuration: metadata.multipleDuration }
                : {}),
              ...(metadata?.apps && "apps" in unlockedFieldProps ? { apps: metadata.apps } : {}),
            },
          },
        });
      })
    );

    // Link workflows with old users' event types if new workflows were added
    if (currentWorkflowIds?.length && oldEventTypes.length) {
      await prisma.$transaction(async (tx) => {
        const eventTypeIds = oldEventTypes.map((e) => e.id);

        const allDesiredPairs = currentWorkflowIds.flatMap((wfId: number) =>
          oldEventTypes.map((oEvTy: { id: number }) => ({
            eventTypeId: oEvTy.id,
            workflowId: wfId,
          }))
        );

        const existingRelationships = await tx.workflowsOnEventTypes.findMany({
          where: {
            workflowId: { in: currentWorkflowIds },
            eventTypeId: { in: eventTypeIds },
          },
          select: {
            workflowId: true,
            eventTypeId: true,
          },
        });

        const existingSet = new Set(
          existingRelationships.map(
            (rel: { eventTypeId: number; workflowId: number }) => `${rel.eventTypeId}_${rel.workflowId}`
          )
        );

        const newRelationshipsToCreate = allDesiredPairs.filter(
          (pair: { eventTypeId: number; workflowId: number }) => {
            const key = `${pair.eventTypeId}_${pair.workflowId}`;
            return !existingSet.has(key);
          }
        );

        if (newRelationshipsToCreate.length > 0) {
          await tx.workflowsOnEventTypes.createMany({
            data: newRelationshipsToCreate,
            skipDuplicates: false,
          });
        }
      });
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
