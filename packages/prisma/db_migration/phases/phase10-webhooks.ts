// ========================================
// FILE: src/migration/phases/phase10-webhooks.ts
// ========================================
import type { MigrationContext } from "../types";

export async function migrateWebhooks(ctx: MigrationContext) {
  ctx.log("Migrating Webhooks...");

  const oldWebhooks = await ctx.oldDb.webhook.findMany();

  await ctx.processBatch(oldWebhooks, async (batch) => {
    const newWebhooks = await Promise.all(
      batch.map(async (oldWebhook: any) => {
        try {
          const userId = oldWebhook.userId ? ctx.idMappings.users[oldWebhook.userId.toString()] : null;
          const calIdTeamId = oldWebhook.teamId
            ? ctx.idMappings.calIdTeams[oldWebhook.teamId.toString()]
            : null;
          const eventTypeId = oldWebhook.eventTypeId
            ? ctx.idMappings.eventTypes[oldWebhook.eventTypeId.toString()]
            : null;

          const newWebhook = await ctx.newDb.webhook.create({
            data: {
              id: oldWebhook.id,
              userId: userId,
              calIdTeamId: calIdTeamId,
              eventTypeId: eventTypeId,
              platformOAuthClientId: oldWebhook.platformOAuthClientId,
              subscriberUrl: oldWebhook.subscriberUrl,
              payloadTemplate: oldWebhook.payloadTemplate,
              createdAt: oldWebhook.createdAt,
              active: oldWebhook.active,
              eventTriggers: oldWebhook.eventTriggers,
              appId: oldWebhook.appId,
              secret: oldWebhook.secret,
              platform: oldWebhook.platform,
              time: oldWebhook.time,
              timeUnit: oldWebhook.timeUnit,
            },
          });

          ctx.idMappings.webhooks[oldWebhook.id] = newWebhook.id;
          return newWebhook;
        } catch (error) {
          ctx.logError(`Failed to migrate webhook ${oldWebhook.id}`, error);
          return null;
        }
      })
    );
    return newWebhooks.filter(Boolean);
  });

  ctx.log(`Migrated ${oldWebhooks.length} webhooks`);
}

export async function migrateWebhookScheduledTriggers(ctx: MigrationContext) {
  ctx.log("Migrating Webhook Scheduled Triggers...");

  const oldTriggers = await ctx.oldDb.webhookScheduledTriggers.findMany();

  await ctx.processBatch(oldTriggers, async (batch) => {
    const newTriggers = await Promise.all(
      batch.map(async (oldTrigger: any) => {
        try {
          const webhookId = oldTrigger.webhookId ? ctx.idMappings.webhooks[oldTrigger.webhookId] : null;

          const newTrigger = await ctx.newDb.webhookScheduledTriggers.create({
            data: {
              jobName: oldTrigger.jobName,
              subscriberUrl: oldTrigger.subscriberUrl,
              payload: oldTrigger.payload,
              startAfter: oldTrigger.startAfter,
              retryCount: oldTrigger.retryCount,
              createdAt: oldTrigger.createdAt,
              appId: oldTrigger.appId,
              webhookId: webhookId,
              bookingId: oldTrigger.bookingId,
            },
          });

          return newTrigger;
        } catch (error) {
          ctx.logError(`Failed to migrate webhook scheduled trigger ${oldTrigger.id}`, error);
          return null;
        }
      })
    );
    return newTriggers.filter(Boolean);
  });

  ctx.log(`Migrated ${oldTriggers.length} webhook scheduled triggers`);
}

export async function runPhase10(ctx: MigrationContext) {
  ctx.log("=== PHASE 10: Webhooks & Integrations ===");
  await migrateWebhooks(ctx);
  await migrateWebhookScheduledTriggers(ctx);
}
