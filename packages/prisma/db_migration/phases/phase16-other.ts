import type { MigrationContext } from "../types";

export async function migrateFeedback(ctx: MigrationContext) {
  ctx.log("Migrating Feedback...");

  const oldFeedback = await ctx.oldDb.feedback.findMany();

  await ctx.processBatch(oldFeedback, async (batch) => {
    const newFeedback = await Promise.all(
      batch.map(async (oldItem: any) => {
        try {
          const userId = ctx.idMappings.users[oldItem.userId.toString()];
          if (!userId) {
            ctx.log(`Skipping feedback ${oldItem.id} - user not found`);
            return null;
          }

          const newItem = await ctx.newDb.feedback.create({
            data: {
              date: oldItem.date,
              userId: userId,
              rating: oldItem.rating,
              comment: oldItem.comment,
            },
          });

          return newItem;
        } catch (error) {
          ctx.logError(`Failed to migrate feedback ${oldItem.id}`, error);
          return null;
        }
      })
    );
    return newFeedback.filter(Boolean);
  });

  ctx.log(`Migrated ${oldFeedback.length} feedback entries`);
}

export async function migrateOutOfOffice(ctx: MigrationContext) {
  ctx.log("Migrating Out of Office Reasons...");

  const oldReasons = await ctx.oldDb.outOfOfficeReason.findMany();

  await ctx.processBatch(oldReasons, async (batch) => {
    const newReasons = await Promise.all(
      batch.map(async (oldReason: any) => {
        try {
          const userId = oldReason.userId ? ctx.idMappings.users[oldReason.userId.toString()] : null;

          const newReason = await ctx.newDb.outOfOfficeReason.create({
            data: {
              emoji: oldReason.emoji,
              reason: oldReason.reason,
              enabled: oldReason.enabled,
              userId: userId,
            },
          });

          ctx.idMappings.outOfOfficeReasons[oldReason.id.toString()] = newReason.id;
          return newReason;
        } catch (error) {
          ctx.logError(`Failed to migrate out of office reason ${oldReason.id}`, error);
          return null;
        }
      })
    );
    return newReasons.filter(Boolean);
  });

  ctx.log("Migrating Out of Office Entries...");

  const oldEntries = await ctx.oldDb.outOfOfficeEntry.findMany();

  await ctx.processBatch(oldEntries, async (batch) => {
    const newEntries = await Promise.all(
      batch.map(async (oldEntry: any) => {
        try {
          const userId = ctx.idMappings.users[oldEntry.userId.toString()];
          const toUserId = oldEntry.toUserId ? ctx.idMappings.users[oldEntry.toUserId.toString()] : null;
          const reasonId = oldEntry.reasonId
            ? ctx.idMappings.outOfOfficeReasons[oldEntry.reasonId.toString()]
            : null;

          if (!userId) {
            ctx.log(`Skipping out of office entry ${oldEntry.id} - user not found`);
            return null;
          }

          const newEntry = await ctx.newDb.outOfOfficeEntry.create({
            data: {
              uuid: oldEntry.uuid,
              start: oldEntry.start,
              end: oldEntry.end,
              notes: oldEntry.notes,
              userId: userId,
              toUserId: toUserId,
              reasonId: reasonId,
              createdAt: oldEntry.createdAt,
              updatedAt: oldEntry.updatedAt,
            },
          });

          ctx.idMappings.outOfOfficeEntries[oldEntry.id.toString()] = newEntry.id;
          return newEntry;
        } catch (error) {
          ctx.logError(`Failed to migrate out of office entry ${oldEntry.id}`, error);
          return null;
        }
      })
    );
    return newEntries.filter(Boolean);
  });

  ctx.log(`Migrated out of office entries`);
}

export async function migrateFilterSegments(ctx: MigrationContext) {
  ctx.log("Migrating Filter Segments...");

  const oldSegments = await ctx.oldDb.filterSegment.findMany();

  await ctx.processBatch(oldSegments, async (batch) => {
    const newSegments = await Promise.all(
      batch.map(async (oldSegment: any) => {
        try {
          const userId = ctx.idMappings.users[oldSegment.userId.toString()];
          const calIdTeamId = oldSegment.teamId
            ? ctx.idMappings.calIdTeams[oldSegment.teamId.toString()]
            : null;

          if (!userId) {
            ctx.log(`Skipping filter segment ${oldSegment.id} - user not found`);
            return null;
          }

          // Map TEAM scope to CALIDTEAM if applicable
          let scope = oldSegment.scope;
          if (scope === "TEAM" && calIdTeamId) {
            scope = "CALIDTEAM";
          }

          const newSegment = await ctx.newDb.filterSegment.create({
            data: {
              name: oldSegment.name,
              tableIdentifier: oldSegment.tableIdentifier,
              scope: scope,
              activeFilters: oldSegment.activeFilters,
              sorting: oldSegment.sorting,
              columnVisibility: oldSegment.columnVisibility,
              columnSizing: oldSegment.columnSizing,
              perPage: oldSegment.perPage,
              searchTerm: oldSegment.searchTerm,
              createdAt: oldSegment.createdAt,
              updatedAt: oldSegment.updatedAt,
              userId: userId,
              teamId: oldSegment.teamId,
              calIdTeamId: calIdTeamId,
            },
          });

          ctx.idMappings.filterSegments[oldSegment.id.toString()] = newSegment.id;
          return newSegment;
        } catch (error) {
          ctx.logError(`Failed to migrate filter segment ${oldSegment.id}`, error);
          return null;
        }
      })
    );
    return newSegments.filter(Boolean);
  });

  ctx.log(`Migrated ${oldSegments.length} filter segments`);
}

export async function migrateSelectedSlots(ctx: MigrationContext) {
  ctx.log("Migrating Selected Slots...");

  const oldSlots = await ctx.oldDb.selectedSlots.findMany();

  await ctx.processBatch(oldSlots, async (batch) => {
    const newSlots = await Promise.all(
      batch.map(async (oldSlot: any) => {
        try {
          const newSlot = await ctx.newDb.selectedSlots.create({
            data: {
              eventTypeId: oldSlot.eventTypeId,
              userId: oldSlot.userId,
              slotUtcStartDate: oldSlot.slotUtcStartDate,
              slotUtcEndDate: oldSlot.slotUtcEndDate,
              uid: oldSlot.uid,
              releaseAt: oldSlot.releaseAt,
              isSeat: oldSlot.isSeat,
            },
          });

          return newSlot;
        } catch (error) {
          ctx.logError(`Failed to migrate selected slot ${oldSlot.id}`, error);
          return null;
        }
      })
    );
    return newSlots.filter(Boolean);
  });

  ctx.log(`Migrated ${oldSlots.length} selected slots`);
}

export async function migrateOtherTables(ctx: MigrationContext) {
  // Migrate Deployment
  ctx.log("Migrating Deployment...");
  const oldDeployment = await ctx.oldDb.deployment.findFirst();
  if (oldDeployment) {
    await ctx.newDb.deployment.create({
      data: {
        id: 1,
        logo: oldDeployment.logo,
        theme: oldDeployment.theme,
        licenseKey: oldDeployment.licenseKey,
        signatureTokenEncrypted: oldDeployment.signatureTokenEncrypted,
        agreedLicenseAt: oldDeployment.agreedLicenseAt,
      },
    });
    ctx.log("Migrated deployment configuration");
  }

  // Migrate Tasks
  ctx.log("Migrating Tasks...");
  const oldTasks = await ctx.oldDb.task.findMany();
  await ctx.processBatch(oldTasks, async (batch) => {
    const newTasks = await Promise.all(
      batch.map(async (oldTask: any) => {
        try {
          const newTask = await ctx.newDb.task.create({
            data: {
              id: oldTask.id,
              createdAt: oldTask.createdAt,
              updatedAt: oldTask.updatedAt,
              scheduledAt: oldTask.scheduledAt,
              succeededAt: oldTask.succeededAt,
              type: oldTask.type,
              payload: oldTask.payload,
              attempts: oldTask.attempts,
              maxAttempts: oldTask.maxAttempts,
              lastError: oldTask.lastError,
              lastFailedAttemptAt: oldTask.lastFailedAttemptAt,
              referenceUid: oldTask.referenceUid,
            },
          });
          return newTask;
        } catch (error) {
          ctx.logError(`Failed to migrate task ${oldTask.id}`, error);
          return null;
        }
      })
    );
    return newTasks.filter(Boolean);
  });
  ctx.log(`Migrated ${oldTasks.length} tasks`);
}

export async function runPhase16(ctx: MigrationContext) {
  ctx.log("=== PHASE 16: Other Features ===");
  await migrateFeedback(ctx);
  await migrateOutOfOffice(ctx);
  await migrateFilterSegments(ctx);
  await migrateSelectedSlots(ctx);
  await migrateOtherTables(ctx);
}
