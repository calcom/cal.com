import type { MigrationContext } from "../types";

export async function migrateUserFeatures(ctx: MigrationContext) {
  ctx.log("Migrating User Features...");

  const oldUserFeatures = await ctx.oldDb.userFeatures.findMany();

  await ctx.processBatch(oldUserFeatures, async (batch) => {
    const newUserFeatures = await Promise.all(
      batch.map(async (oldFeature: any) => {
        try {
          const userId = ctx.idMappings.users[oldFeature.userId.toString()];
          if (!userId) {
            ctx.log(`Skipping user feature ${oldFeature.featureId} - user not found`);
            return null;
          }

          const newFeature = await ctx.newDb.userFeatures.create({
            data: {
              userId: userId,
              featureId: oldFeature.featureId,
              assignedAt: oldFeature.assignedAt,
              assignedBy: oldFeature.assignedBy,
              updatedAt: oldFeature.updatedAt,
            },
          });

          return newFeature;
        } catch (error) {
          ctx.logError(`Failed to migrate user feature ${oldFeature.userId}-${oldFeature.featureId}`, error);
          return null;
        }
      })
    );
    return newUserFeatures.filter(Boolean);
  });

  ctx.log(`Migrated user features`);
}
export async function migrateCalIdTeamFeatures(ctx: MigrationContext) {
  ctx.log("Migrating TeamFeatures → CalIdTeamFeatures...");

  const oldTeamFeatures = await ctx.oldDb.teamFeatures.findMany();

  await ctx.processBatch(oldTeamFeatures, async (batch) => {
    const newTeamFeatures = await Promise.all(
      batch.map(async (oldFeature: any) => {
        try {
          const calIdTeamId = ctx.idMappings.calIdTeams[oldFeature.teamId.toString()];
          if (!calIdTeamId) {
            ctx.log(`Skipping team feature ${oldFeature.teamId}-${oldFeature.featureId} - team not found`);
            return null;
          }

          const newFeature = await ctx.newDb.calIdTeamFeatures.create({
            data: {
              calIdTeamId: calIdTeamId,
              featureId: oldFeature.featureId,
              assignedAt: oldFeature.assignedAt,
              assignedBy: oldFeature.assignedBy,
              updatedAt: oldFeature.updatedAt,
            },
          });

          return newFeature;
        } catch (error) {
          ctx.logError(`Failed to migrate team feature ${oldFeature.teamId}-${oldFeature.featureId}`, error);
          return null;
        }
      })
    );
    return newTeamFeatures.filter(Boolean);
  });

  ctx.log(`Migrated team features to CalIdTeamFeatures`);
}

export async function migrateImpersonations(ctx: MigrationContext) {
  ctx.log("Migrating Impersonations...");

  const oldImpersonations = await ctx.oldDb.impersonations.findMany();

  await ctx.processBatch(oldImpersonations, async (batch) => {
    const newImpersonations = await Promise.all(
      batch.map(async (oldImpersonation: any) => {
        try {
          const impersonatedUserId = ctx.idMappings.users[oldImpersonation.impersonatedUserId.toString()];
          const impersonatedById = ctx.idMappings.users[oldImpersonation.impersonatedById.toString()];

          if (!impersonatedUserId || !impersonatedById) {
            ctx.log(`Skipping impersonation ${oldImpersonation.id} - users not found`);
            return null;
          }

          const newImpersonation = await ctx.newDb.impersonations.create({
            data: {
              createdAt: oldImpersonation.createdAt,
              impersonatedUserId: impersonatedUserId,
              impersonatedById: impersonatedById,
            },
          });

          return newImpersonation;
        } catch (error) {
          ctx.logError(`Failed to migrate impersonation ${oldImpersonation.id}`, error);
          return null;
        }
      })
    );
    return newImpersonations.filter(Boolean);
  });

  ctx.log(`Migrated ${oldImpersonations.length} impersonations`);
}

export async function runPhase14(ctx: MigrationContext) {
  ctx.log("=== PHASE 14: Features & Permissions ===");
  await migrateUserFeatures(ctx);
  await migrateCalIdTeamFeatures(ctx);
  await migrateImpersonations(ctx);
}
