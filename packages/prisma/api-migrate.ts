import { PrismaClient } from "@calcom/prisma/client";

const prisma = new PrismaClient();

interface MigrationStats {
  apiKeysProcessed: number;
  apiKeysMigrated: number;
  apiKeysSkipped: number;
  rateLimitsMigrated: number;
  errors: Array<{ recordId: string; error: string }>;
}

async function migrateApiKeysAndRateLimits() {
  const stats: MigrationStats = {
    apiKeysProcessed: 0,
    apiKeysMigrated: 0,
    apiKeysSkipped: 0,
    rateLimitsMigrated: 0,
    errors: [],
  };

  console.log("Starting API Key and Rate Limit migration...");
  console.log("=".repeat(60));

  try {
    // Fetch all existing ApiKeys with their rate limits
    const oldApiKeys = await prisma.apiKey.findMany({
      include: {
        rateLimits: true,
      },
    });

    console.log(`Found ${oldApiKeys.length} API keys to migrate`);

    for (const oldKey of oldApiKeys) {
      stats.apiKeysProcessed++;

      try {
        // Check if this API key has already been migrated
        const existingCalIdKey = await prisma.calIdApiKey.findUnique({
          where: { hashedKey: oldKey.hashedKey },
        });

        if (existingCalIdKey) {
          console.log(
            `⏭️  Skipping API key ${oldKey.id} - already migrated (hashedKey exists in CalIdApiKey)`
          );
          stats.apiKeysSkipped++;
          continue;
        }

        // Determine the teamId for the new schema
        // Priority: calIdTeamId > teamId (converted to calIdTeam) > null
        let newTeamId: number | null = null;

        if (oldKey.calIdTeamId) {
          // Already has a calIdTeamId reference
          newTeamId = oldKey.calIdTeamId;
        } else if (oldKey.teamId) {
          // Try to find corresponding CalIdTeam for the old Team
          const calIdTeam = await prisma.calIdTeam.findFirst({
            where: {
              // Assuming there's a relationship or migration path
              // You may need to adjust this based on your Team -> CalIdTeam migration
              id: oldKey.teamId,
            },
          });

          if (calIdTeam) {
            newTeamId = calIdTeam.id;
          } else {
            console.warn(
              `⚠️  API key ${oldKey.id} references teamId ${oldKey.teamId} but no corresponding CalIdTeam found. Setting teamId to null.`
            );
          }
        }

        // Create the new CalIdApiKey
        const newCalIdApiKey = await prisma.calIdApiKey.create({
          data: {
            id: oldKey.id, // Preserve the same ID
            userId: oldKey.userId,
            teamId: newTeamId,
            note: oldKey.note,
            createdAt: oldKey.createdAt,
            expiresAt: oldKey.expiresAt,
            lastUsedAt: oldKey.lastUsedAt,
            hashedKey: oldKey.hashedKey,
            appId: oldKey.appId,
          },
        });

        console.log(`✅ Migrated API key ${oldKey.id} (userId: ${oldKey.userId}, teamId: ${newTeamId})`);
        stats.apiKeysMigrated++;

        // Migrate associated rate limits
        for (const rateLimit of oldKey.rateLimits) {
          try {
            // Check if rate limit already migrated
            const existingRateLimit = await prisma.calIdRateLimit.findFirst({
              where: {
                id: rateLimit.id,
              },
            });

            if (existingRateLimit) {
              console.log(`  ⏭️  Skipping rate limit ${rateLimit.id} - already migrated`);
              continue;
            }

            await prisma.calIdRateLimit.create({
              data: {
                id: rateLimit.id, // Preserve the same ID
                name: rateLimit.name,
                calIdApiKeyId: newCalIdApiKey.id,
                ttl: rateLimit.ttl,
                limit: rateLimit.limit,
                blockDuration: rateLimit.blockDuration,
                createdAt: rateLimit.createdAt,
                updatedAt: rateLimit.updatedAt,
              },
            });

            console.log(`  ✅ Migrated rate limit ${rateLimit.id}`);
            stats.rateLimitsMigrated++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`  ❌ Error migrating rate limit ${rateLimit.id}:`, errorMessage);
            stats.errors.push({
              recordId: `RateLimit:${rateLimit.id}`,
              error: errorMessage,
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error migrating API key ${oldKey.id}:`, errorMessage);
        stats.errors.push({
          recordId: `ApiKey:${oldKey.id}`,
          error: errorMessage,
        });
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("Migration Summary:");
    console.log("=".repeat(60));
    console.log(`API Keys Processed: ${stats.apiKeysProcessed}`);
    console.log(`API Keys Migrated: ${stats.apiKeysMigrated}`);
    console.log(`API Keys Skipped: ${stats.apiKeysSkipped}`);
    console.log(`Rate Limits Migrated: ${stats.rateLimitsMigrated}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\nErrors encountered:");
      stats.errors.forEach((err) => {
        console.log(`  - ${err.recordId}: ${err.error}`);
      });
    }

    console.log("\n✨ Migration completed!");
  } catch (error) {
    console.error("Fatal error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateApiKeysAndRateLimits()
  .then(() => {
    console.log("\n🎉 Migration script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration script failed:", error);
    process.exit(1);
  });
