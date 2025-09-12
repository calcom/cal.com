import type { MigrationContext } from "../types";

export async function migrateSchedules(ctx: MigrationContext) {
  ctx.log("Migrating Schedules...");

  const oldSchedules = await ctx.oldDb.schedule.findMany();

  await ctx.processBatch(oldSchedules, async (batch) => {
    const newSchedules = await Promise.all(
      batch.map(async (oldSchedule: any) => {
        try {
          const userId = ctx.idMappings.users[oldSchedule.userId.toString()];
          if (!userId) {
            ctx.log(`Skipping schedule ${oldSchedule.id} - user not found`);
            return null;
          }

          const newSchedule = await ctx.newDb.schedule.create({
            data: {
              userId: userId,
              name: oldSchedule.name,
              timeZone: oldSchedule.timeZone,
            },
          });

          ctx.idMappings.schedules[oldSchedule.id.toString()] = newSchedule.id;
          return newSchedule;
        } catch (error) {
          ctx.logError(`Failed to migrate schedule ${oldSchedule.id}`, error);
          return null;
        }
      })
    );
    return newSchedules.filter(Boolean);
  });

  ctx.log(`Migrated ${oldSchedules.length} schedules`);
}

export async function migrateAvailabilities(ctx: MigrationContext) {
  ctx.log("Migrating Availabilities...");

  const oldAvailabilities = await ctx.oldDb.availability.findMany();

  await ctx.processBatch(oldAvailabilities, async (batch) => {
    const newAvailabilities = await Promise.all(
      batch.map(async (oldAvailability: any) => {
        try {
          const scheduleId = oldAvailability.scheduleId
            ? ctx.idMappings.schedules[oldAvailability.scheduleId.toString()]
            : null;
          const userId = oldAvailability.userId
            ? ctx.idMappings.users[oldAvailability.userId.toString()]
            : null;

          const newAvailability = await ctx.newDb.availability.create({
            data: {
              userId: userId,
              eventTypeId: oldAvailability.eventTypeId,
              days: oldAvailability.days,
              startTime: oldAvailability.startTime,
              endTime: oldAvailability.endTime,
              date: oldAvailability.date,
              scheduleId: scheduleId,
            },
          });

          ctx.idMappings.availabilities[oldAvailability.id.toString()] = newAvailability.id;
          return newAvailability;
        } catch (error) {
          ctx.logError(`Failed to migrate availability ${oldAvailability.id}`, error);
          return null;
        }
      })
    );
    return newAvailabilities.filter(Boolean);
  });

  ctx.log(`Migrated ${oldAvailabilities.length} availabilities`);
}

export async function runPhase5(ctx: MigrationContext) {
  ctx.log("=== PHASE 5: Schedules & Availability ===");
  await migrateSchedules(ctx);
  await migrateAvailabilities(ctx);
}
