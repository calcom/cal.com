import type { MigrationContext } from "../types";

export async function migrateApiKeys(ctx: MigrationContext) {
  ctx.log("Migrating API Keys...");

  const oldApiKeys = await ctx.oldDb.apiKey.findMany();

  await ctx.processBatch(oldApiKeys, async (batch) => {
    const newApiKeys = await Promise.all(
      batch.map(async (oldApiKey: any) => {
        try {
          const userId = ctx.idMappings.users[oldApiKey.userId.toString()];
          const calIdTeamId = oldApiKey.teamId
            ? ctx.idMappings.calIdTeams[oldApiKey.teamId.toString()]
            : null;

          if (!userId) {
            ctx.log(`Skipping API key ${oldApiKey.id} - user not found`);
            return null;
          }

          const newApiKey = await ctx.newDb.apiKey.create({
            data: {
              id: oldApiKey.id,
              userId: userId,
              calIdTeamId: calIdTeamId,
              note: oldApiKey.note,
              createdAt: oldApiKey.createdAt,
              expiresAt: oldApiKey.expiresAt,
              lastUsedAt: oldApiKey.lastUsedAt,
              hashedKey: oldApiKey.hashedKey,
              appId: oldApiKey.appId,
            },
          });

          ctx.idMappings.apiKeys[oldApiKey.id] = newApiKey.id;
          return newApiKey;
        } catch (error) {
          ctx.logError(`Failed to migrate API key ${oldApiKey.id}`, error);
          return null;
        }
      })
    );
    return newApiKeys.filter(Boolean);
  });

  ctx.log(`Migrated ${oldApiKeys.length} API keys`);
}

export async function migrateAccessCodes(ctx: MigrationContext) {
  ctx.log("Migrating Access Codes...");

  const oldAccessCodes = await ctx.oldDb.accessCode.findMany();

  await ctx.processBatch(oldAccessCodes, async (batch) => {
    const newAccessCodes = await Promise.all(
      batch.map(async (oldAccessCode: any) => {
        try {
          const userId = oldAccessCode.userId ? ctx.idMappings.users[oldAccessCode.userId.toString()] : null;
          const calIdTeamId = oldAccessCode.teamId
            ? ctx.idMappings.calIdTeams[oldAccessCode.teamId.toString()]
            : null;

          const newAccessCode = await ctx.newDb.accessCode.create({
            data: {
              code: oldAccessCode.code,
              clientId: oldAccessCode.clientId,
              expiresAt: oldAccessCode.expiresAt,
              scopes: oldAccessCode.scopes,
              userId: userId,
              calIdTeamId: calIdTeamId,
            },
          });

          return newAccessCode;
        } catch (error) {
          ctx.logError(`Failed to migrate access code ${oldAccessCode.id}`, error);
          return null;
        }
      })
    );
    return newAccessCodes.filter(Boolean);
  });

  ctx.log(`Migrated ${oldAccessCodes.length} access codes`);
}

export async function runPhase13(ctx: MigrationContext) {
  ctx.log("=== PHASE 13: API & Access ===");
  await migrateApiKeys(ctx);
  await migrateAccessCodes(ctx);
}
