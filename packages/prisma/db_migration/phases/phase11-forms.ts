import type { MigrationContext } from "../types";

export async function migrateRoutingForms(ctx: MigrationContext) {
  ctx.log("Migrating Routing Forms...");

  const oldForms = await ctx.oldDb.app_RoutingForms_Form.findMany();

  await ctx.processBatch(oldForms, async (batch) => {
    const newForms = await Promise.all(
      batch.map(async (oldForm: any) => {
        try {
          const userId = ctx.idMappings.users[oldForm.userId.toString()];
          const calIdTeamId = oldForm.teamId ? ctx.idMappings.calIdTeams[oldForm.teamId.toString()] : null;
          const updatedById = oldForm.updatedById
            ? ctx.idMappings.users[oldForm.updatedById.toString()]
            : null;

          if (!userId) {
            ctx.log(`Skipping routing form ${oldForm.id} - user not found`);
            return null;
          }

          const newForm = await ctx.newDb.app_RoutingForms_Form.create({
            data: {
              id: oldForm.id,
              description: oldForm.description,
              position: oldForm.position,
              routes: oldForm.routes,
              createdAt: oldForm.createdAt,
              updatedAt: oldForm.updatedAt,
              name: oldForm.name,
              fields: oldForm.fields,
              userId: userId,
              updatedById: updatedById,
              calIdTeamId: calIdTeamId,
              disabled: oldForm.disabled,
              settings: oldForm.settings,
            },
          });

          ctx.idMappings.routingForms[oldForm.id] = newForm.id;
          return newForm;
        } catch (error) {
          ctx.logError(`Failed to migrate routing form ${oldForm.id}`, error);
          return null;
        }
      })
    );
    return newForms.filter(Boolean);
  });

  ctx.log(`Migrated ${oldForms.length} routing forms`);
}

export async function migrateRoutingFormResponses(ctx: MigrationContext) {
  ctx.log("Migrating Routing Form Responses...");

  const oldResponses = await ctx.oldDb.app_RoutingForms_FormResponse.findMany();

  await ctx.processBatch(oldResponses, async (batch) => {
    const newResponses = await Promise.all(
      batch.map(async (oldResponse: any) => {
        try {
          const newResponse = await ctx.newDb.app_RoutingForms_FormResponse.create({
            data: {
              uuid: oldResponse.uuid,
              formFillerId: oldResponse.formFillerId,
              formId: oldResponse.formId,
              response: oldResponse.response,
              createdAt: oldResponse.createdAt,
              updatedAt: oldResponse.updatedAt,
              routedToBookingUid: oldResponse.routedToBookingUid,
              chosenRouteId: oldResponse.chosenRouteId,
            },
          });

          return newResponse;
        } catch (error) {
          ctx.logError(`Failed to migrate routing form response ${oldResponse.id}`, error);
          return null;
        }
      })
    );
    return newResponses.filter(Boolean);
  });

  ctx.log(`Migrated ${oldResponses.length} routing form responses`);
}

export async function runPhase11(ctx: MigrationContext) {
  ctx.log("=== PHASE 11: Forms & Routing ===");
  await migrateRoutingForms(ctx);
  await migrateRoutingFormResponses(ctx);
}
