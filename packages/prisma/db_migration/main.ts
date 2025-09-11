import { PrismaClient as NewPrismaClient } from "@prisma/client";
import { PrismaClient as OldPrismaClient } from "@prisma/client";

import { runPhase1 } from "./phases/phase1-core";
import { runPhase2 } from "./phases/phase2-auth";
import { runPhase3 } from "./phases/phase3-teams";
import { runPhase4 } from "./phases/phase4-memberships";
import { runPhase5 } from "./phases/phase5-schedules";
import { runPhase6 } from "./phases/phase6-credentials";
import { runPhase7 } from "./phases/phase7-eventtypes";
import { runPhase8 } from "./phases/phase8-bookings";
import { runPhase9 } from "./phases/phase9-workflows";
import { runPhase10 } from "./phases/phase10-webhooks";
import { runPhase11 } from "./phases/phase11-forms";
import { runPhase12 } from "./phases/phase12-attributes";
import { runPhase13 } from "./phases/phase13-api-access";
import { runPhase14 } from "./phases/phase14-features";
import { runPhase15 } from "./phases/phase15-verification";
import { runPhase16 } from "./phases/phase16-other";
import { runPhase17 } from "./phases/phase17-relations";
import { createIdMappings, createMigrationContext, log, logError } from "./utils";

// Import other phases as you implement them...

async function runMigration() {
  const oldDb = new OldPrismaClient({
    datasources: {
      db: {
        url: process.env.OLD_DATABASE_URL,
      },
    },
  });

  const newDb = new NewPrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  const idMappings = createIdMappings();
  const ctx = createMigrationContext(oldDb, newDb, idMappings);

  try {
    log("Starting comprehensive migration process...");

    // Connect to both databases
    await oldDb.$connect();
    await newDb.$connect();
    log("Connected to both databases");

    // Run all phases in order
    await runPhase1(ctx); // Core entities
    await runPhase2(ctx); // Auth & Session
    await runPhase3(ctx); // Teams & Organizations
    await runPhase4(ctx); // Memberships & Profiles

    await runPhase5(ctx); // Schedules & Availability
    await runPhase6(ctx); // Credentials & Calendars
    await runPhase7(ctx); // Event Types
    await runPhase8(ctx); // Bookings
    await runPhase9(ctx); // Workflows
    await runPhase10(ctx); // Webhooks & Integrations
    await runPhase11(ctx); // Forms & Routing
    await runPhase12(ctx); // Attributes & Roles
    await runPhase13(ctx); // API & Access
    await runPhase14(ctx); // Features & Permissions
    await runPhase15(ctx); // Verification & Security
    await runPhase16(ctx); // Other Features
    await runPhase17(ctx); // Update Relations

    log("Migration completed successfully!");

    // Print summary
    log("=== MIGRATION SUMMARY ===");
    log(`Users migrated: ${Object.keys(idMappings.users).length}`);
    log(`CalIdTeams migrated: ${Object.keys(idMappings.calIdTeams).length}`);
    log(`CalIdMemberships migrated: ${Object.keys(idMappings.calIdMemberships).length}`);
    log(`Profiles migrated: ${Object.keys(idMappings.profiles).length}`);
    // Add more summary logs...
  } catch (error) {
    logError("Migration failed", error);
    throw error;
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
    log("Disconnected from databases");
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      log("Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logError("Migration script failed", error);
      process.exit(1);
    });
}

export { runMigration };
