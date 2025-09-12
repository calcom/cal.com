// ========================================
// FILE: src/migration/validate.ts
// ========================================
import type { MigrationContext } from "./types";

export async function validateMigration(ctx: MigrationContext) {
  ctx.log("=== VALIDATING MIGRATION ===");

  const validationResults: { [key: string]: { old: number; new: number; match: boolean } } = {};

  // Validate core tables
  const tables = [
    "user",
    "calIdTeam",
    "calIdMembership",
    "profile",
    "schedule",
    "eventType",
    "booking",
    "credential",
    "webhook",
    "apiKey",
  ];

  for (const table of tables) {
    let oldCount = 0;
    let newCount = 0;

    if (table === "calIdTeam") {
      oldCount = await ctx.oldDb.team.count();
      newCount = await ctx.newDb.calIdTeam.count();
    } else if (table === "calIdMembership") {
      oldCount = await ctx.oldDb.membership.count();
      newCount = await ctx.newDb.calIdMembership.count();
    } else {
      oldCount = await ctx.oldDb[table].count();
      newCount = await ctx.newDb[table].count();
    }

    validationResults[table] = {
      old: oldCount,
      new: newCount,
      match: oldCount === newCount,
    };
  }

  // Print validation results
  ctx.log("Validation Results:");
  Object.entries(validationResults).forEach(([table, result]) => {
    const status = result.match ? "✓" : "✗";
    ctx.log(`${status} ${table}: Old=${result.old}, New=${result.new}`);
  });

  // Check for any mismatches
  const hasErrors = Object.values(validationResults).some((r) => !r.match);
  if (hasErrors) {
    ctx.log("WARNING: Some tables have mismatched record counts!");
  } else {
    ctx.log("SUCCESS: All validated tables have matching record counts!");
  }

  return !hasErrors;
}
