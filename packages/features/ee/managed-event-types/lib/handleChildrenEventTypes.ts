import type { DeepMockProxy } from "vitest-mock-extended";

import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { sendSlugReplacementEmail } from "@calcom/emails/integration-email-service";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import type { EventType, Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import {
  allManagedEventTypeProps,
  allManagedEventTypePropsForZod,
  unlockedManagedEventTypePropsForZod,
} from "@calcom/prisma/zod-utils";
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
  calVideoSettings?: {
    disableRecordingForGuests?: boolean | null;
    disableRecordingForOrganizer?: boolean | null;
    enableAutomaticTranscription?: boolean | null;
    enableAutomaticRecordingForOrganizer?: boolean | null;
    disableTranscriptionForGuests?: boolean | null;
    disableTranscriptionForOrganizer?: boolean | null;
    redirectUrlOnExit?: string | null;
    requireEmailForGuests?: boolean | null;
  } | null;
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
  calVideoSettings,
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

  const allManagedEventTypePropsZod = _ManagedEventTypeModel.pick(allManagedEventTypePropsForZod);
  const managedEventTypeValues = allManagedEventTypePropsZod
    .omit(unlockedManagedEventTypePropsForZod)
    .parse(eventType);

  // Check we are certainly dealing with a managed event type through its metadata
  if (!managedEventTypeValues.metadata?.managedEventConfig)
    return {
      message: "No managed event metadata",
    };

  // Define the values for unlocked properties to use on creation, not updation
  const unlockedEventTypeValues = allManagedEventTypePropsZod
    .pick(unlockedManagedEventTypePropsForZod)
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
      return {
        instantMeetingScheduleId: eventType.instantMeetingScheduleId ?? undefined,
        profileId: profileId ?? null,
        ...managedEventTypeValues,
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

      // Create CalVideoSettings for new children if parent has settings
      if (calVideoSettings && createdEvents.length > 0) {
        const calVideoSettingsToCreate = createdEvents.map((event) => ({
          eventTypeId: event.id,
          disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
          disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
          enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
          enableAutomaticRecordingForOrganizer:
            calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
          disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
          disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
          redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
          requireEmailForGuests: calVideoSettings.requireEmailForGuests ?? false,
        }));

        await tx.calVideoSettings.createMany({
          data: calVideoSettingsToCreate,
          skipDuplicates: true,
        });
      }
    });
  }

  // Old users updated
  if (oldUserIds?.length) {
    // 1. Initial Checks and Setup
    deletedExistentEventTypes = await checkExistentEventTypes({
      updatedEventType,
      children,
      prisma,
      userIds: oldUserIds,
      teamName: oldEventType.team?.name || null,
    });

    const { unlockedFields } = managedEventTypeValues.metadata?.managedEventConfig ?? {};

    // Transform unlocked fields into a lookup object with mapped keys
    const unlockedFieldProps = Object.keys(unlockedFields ?? {}).reduce((acc, key) => {
      const mappedKey =
        key === "afterBufferTime"
          ? "afterEventBuffer"
          : key === "beforeBufferTime"
            ? "beforeEventBuffer"
            : key;
      // @ts-expect-error Element implicitly has any type
      acc[mappedKey] = true;
      return acc;
    }, {});

    // Prepare payload: Omit unlocked fields and the "children" property
    const updatePayload = allManagedEventTypePropsZod.omit(unlockedFieldProps).parse(eventType);
    const updatePayloadFiltered = Object.entries(updatePayload)
      .filter(([key, _]) => key !== "children")
      .reduce((newObj, [key, value]) => ({ ...newObj, [key]: value }), {});

    // 2. Data Fetching Optimization
    const existingRecords = await prisma.eventType.findMany({
      where: { parentId, userId: { in: oldUserIds } },
      select: { userId: true, metadata: true },
    });

    const metadataMap = new Map(existingRecords.map((rec) => [rec.userId, rec.metadata]));

    // 3. Define Reusable Update Logic
    const performUpdate = async (userId: number) => {
      try {
        const rawMetadata = metadataMap.get(userId);
        const metadata = eventTypeMetaDataSchemaWithTypedApps.parse(rawMetadata || {});

        return await prisma.eventType.update({
          where: { userId_parentId: { userId, parentId } },
          data: {
            ...updatePayloadFiltered,
            rrHostSubsetEnabled: false,
            hidden: children?.find((ch) => ch.owner.id === userId)?.hidden ?? false,
            ...("schedule" in unlockedFieldProps ? {} : { scheduleId: eventType.scheduleId || null }),
            restrictionScheduleId: null,
            useBookerTimezone: false,
            hashedLink: "multiplePrivateLinks" in unlockedFieldProps ? undefined : { deleteMany: {} },
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
      } catch (error) {
        throw { userId, error };
      }
    };

    // 4. Batch Execution Handler
    const executeBatch = async (ids: number[]) => {
      const successes: EventType[] = [];
      const failures: { userId: number; error: Error }[] = [];
      const BATCH_SIZE = 50;

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(performUpdate));

        results.forEach((res) => {
          if (res.status === "fulfilled") successes.push(res.value);
          else failures.push(res.reason);
        });
      }
      return { successes, failures };
    };

    // 5. Run Updates & Retries
    const { successes: oldEventTypes, failures: failedUpdates } = await executeBatch(oldUserIds);

    if (failedUpdates.length > 0) {
      logger.info(`Retrying ${failedUpdates.length} failed updates...`);
      const retry = await executeBatch(failedUpdates.map((f) => f.userId));
      oldEventTypes.push(...retry.successes);
      // Any remaining failures in retry.failures are permanent
      if (retry.failures.length > 0) {
        logger.error("handleChildrenEventType - Could not update managed event-type", {
          parentId,
          userIds: retry.failures.map((failure) => failure.userId),
        });
      }
    }

    // 6. Workflow Linkage
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
            skipDuplicates: true,
          });
        }
      });
    }

    // Sync CalVideoSettings to existing children
    if (oldEventTypes.length > 0) {
      const childEventTypeIds = oldEventTypes.map((e) => e.id);
      const BATCH_SIZE = 50;

      if (calVideoSettings) {
        // Parent has CalVideoSettings - upsert for all children
        for (let i = 0; i < childEventTypeIds.length; i += BATCH_SIZE) {
          const batch = childEventTypeIds.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map((eventTypeId) =>
              prisma.calVideoSettings.upsert({
                where: { eventTypeId },
                update: {
                  disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
                  disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
                  enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
                  enableAutomaticRecordingForOrganizer:
                    calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
                  disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
                  disableTranscriptionForOrganizer:
                    calVideoSettings.disableTranscriptionForOrganizer ?? false,
                  redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
                  requireEmailForGuests: calVideoSettings.requireEmailForGuests ?? false,
                  updatedAt: new Date(),
                },
                create: {
                  eventTypeId,
                  disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
                  disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
                  enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
                  enableAutomaticRecordingForOrganizer:
                    calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
                  disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
                  disableTranscriptionForOrganizer:
                    calVideoSettings.disableTranscriptionForOrganizer ?? false,
                  redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
                  requireEmailForGuests: calVideoSettings.requireEmailForGuests ?? false,
                },
              })
            )
          );
        }
      } else if (calVideoSettings === null) {
        // Parent's CalVideoSettings were removed - delete from all children
        await prisma.calVideoSettings.deleteMany({
          where: {
            eventTypeId: { in: childEventTypeIds },
          },
        });
      }
      // Note: If calVideoSettings is undefined, don't touch children's settings
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
