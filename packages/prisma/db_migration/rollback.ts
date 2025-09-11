// ========================================
// FILE: src/migration/rollback.ts
// ========================================
import type { MigrationContext } from "./types";

export async function rollbackMigration(ctx: MigrationContext) {
  ctx.log("=== STARTING ROLLBACK ===");
  ctx.log("WARNING: This will delete all data from the new database!");

  // Delete in reverse order of dependencies
  const tablesToDelete = [
    // First delete tables with foreign key dependencies
    "calIdWorkflowReminder",
    "calIdWorkflowStep",
    "calIdWorkflowsOnEventTypes",
    "calIdWorkflowsOnTeams",
    "calIdWorkflow",
    "bookingSeat",
    "bookingReference",
    "attendee",
    "payment",
    "booking",
    "eventTypeCustomInput",
    "hashedLink",
    "host",
    "eventType",
    "destinationCalendar",
    "selectedCalendar",
    "credential",
    "availability",
    "schedule",
    "profile",
    "calIdMembership",
    "calIdTeam",
    "secondaryEmail",
    "session",
    "account",
    "userPassword",
    "travelSchedule",
    "user",
    "feature",
    "app",
  ];

  for (const table of tablesToDelete) {
    try {
      ctx.log(`Deleting all records from ${table}...`);
      await ctx.newDb[table].deleteMany({});
      ctx.log(`Deleted all records from ${table}`);
    } catch (error) {
      ctx.logError(`Failed to delete from ${table}`, error);
    }
  }

  ctx.log("=== ROLLBACK COMPLETE ===");
}
