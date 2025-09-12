import type { MigrationContext } from "../types";

export async function migrateAttributes(ctx: MigrationContext) {
  ctx.log("Migrating Attributes...");

  const oldAttributes = await ctx.oldDb.attribute.findMany();

  await ctx.processBatch(oldAttributes, async (batch) => {
    const newAttributes = await Promise.all(
      batch.map(async (oldAttribute: any) => {
        try {
          const calIdTeamId = ctx.idMappings.calIdTeams[oldAttribute.teamId.toString()];

          if (!calIdTeamId) {
            ctx.log(`Skipping attribute ${oldAttribute.id} - team not found`);
            return null;
          }

          const newAttribute = await ctx.newDb.attribute.create({
            data: {
              id: oldAttribute.id,
              teamId: oldAttribute.teamId,
              calIdTeamId: calIdTeamId,
              type: oldAttribute.type,
              name: oldAttribute.name,
              slug: oldAttribute.slug,
              enabled: oldAttribute.enabled,
              usersCanEditRelation: oldAttribute.usersCanEditRelation,
              createdAt: oldAttribute.createdAt,
              updatedAt: oldAttribute.updatedAt,
              isWeightsEnabled: oldAttribute.isWeightsEnabled,
              isLocked: oldAttribute.isLocked,
            },
          });

          ctx.idMappings.attributes[oldAttribute.id] = newAttribute.id;
          return newAttribute;
        } catch (error) {
          ctx.logError(`Failed to migrate attribute ${oldAttribute.id}`, error);
          return null;
        }
      })
    );
    return newAttributes.filter(Boolean);
  });

  ctx.log(`Migrated ${oldAttributes.length} attributes`);
}

export async function migrateAttributeOptions(ctx: MigrationContext) {
  ctx.log("Migrating Attribute Options...");

  const oldOptions = await ctx.oldDb.attributeOption.findMany();

  await ctx.processBatch(oldOptions, async (batch) => {
    const newOptions = await Promise.all(
      batch.map(async (oldOption: any) => {
        try {
          const attributeId = ctx.idMappings.attributes[oldOption.attributeId];

          if (!attributeId) {
            ctx.log(`Skipping attribute option ${oldOption.id} - attribute not found`);
            return null;
          }

          const newOption = await ctx.newDb.attributeOption.create({
            data: {
              id: oldOption.id,
              attributeId: attributeId,
              value: oldOption.value,
              slug: oldOption.slug,
              isGroup: oldOption.isGroup,
              contains: oldOption.contains,
            },
          });

          ctx.idMappings.attributeOptions[oldOption.id] = newOption.id;
          return newOption;
        } catch (error) {
          ctx.logError(`Failed to migrate attribute option ${oldOption.id}`, error);
          return null;
        }
      })
    );
    return newOptions.filter(Boolean);
  });

  ctx.log(`Migrated ${oldOptions.length} attribute options`);
}

export async function migrateRoles(ctx: MigrationContext) {
  ctx.log("Migrating Roles...");

  const oldRoles = await ctx.oldDb.role.findMany();

  await ctx.processBatch(oldRoles, async (batch) => {
    const newRoles = await Promise.all(
      batch.map(async (oldRole: any) => {
        try {
          const calIdTeamId = oldRole.teamId ? ctx.idMappings.calIdTeams[oldRole.teamId.toString()] : null;

          const newRole = await ctx.newDb.role.create({
            data: {
              id: oldRole.id,
              name: oldRole.name,
              color: oldRole.color,
              description: oldRole.description,
              teamId: oldRole.teamId,
              calIdTeamId: calIdTeamId,
              createdAt: oldRole.createdAt,
              updatedAt: oldRole.updatedAt,
              type: oldRole.type,
            },
          });

          ctx.idMappings.roles[oldRole.id] = newRole.id;
          return newRole;
        } catch (error) {
          ctx.logError(`Failed to migrate role ${oldRole.id}`, error);
          return null;
        }
      })
    );
    return newRoles.filter(Boolean);
  });

  ctx.log(`Migrated ${oldRoles.length} roles`);
}

export async function runPhase12(ctx: MigrationContext) {
  ctx.log("=== PHASE 12: Attributes & Roles ===");
  await migrateAttributes(ctx);
  await migrateAttributeOptions(ctx);
  await migrateRoles(ctx);
}
