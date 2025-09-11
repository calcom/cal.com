import type { MigrationContext } from "../types";

export async function migrateWorkspacePlatforms(ctx: MigrationContext) {
  ctx.log("Migrating Workspace Platforms...");

  const oldPlatforms = await ctx.oldDb.workspacePlatform.findMany();

  await ctx.processBatch(oldPlatforms, async (batch) => {
    const newPlatforms = await Promise.all(
      batch.map(async (oldPlatform: any) => {
        try {
          const newPlatform = await ctx.newDb.workspacePlatform.create({
            data: {
              slug: oldPlatform.slug,
              name: oldPlatform.name,
              description: oldPlatform.description,
              defaultServiceAccountKey: oldPlatform.defaultServiceAccountKey,
              createdAt: oldPlatform.createdAt,
              updatedAt: oldPlatform.updatedAt,
              enabled: oldPlatform.enabled,
            },
          });

          ctx.idMappings.workspacePlatforms[oldPlatform.id.toString()] = newPlatform.id;
          return newPlatform;
        } catch (error) {
          ctx.logError(`Failed to migrate workspace platform ${oldPlatform.id}`, error);
          return null;
        }
      })
    );
    return newPlatforms.filter(Boolean);
  });

  ctx.log(`Migrated ${oldPlatforms.length} workspace platforms`);
}

export async function migrateDelegationCredentials(ctx: MigrationContext) {
  ctx.log("Migrating Delegation Credentials...");

  const oldCredentials = await ctx.oldDb.delegationCredential.findMany();

  await ctx.processBatch(oldCredentials, async (batch) => {
    const newCredentials = await Promise.all(
      batch.map(async (oldCred: any) => {
        try {
          const workspacePlatformId =
            ctx.idMappings.workspacePlatforms[oldCred.workspacePlatformId.toString()];

          if (!workspacePlatformId) {
            ctx.log(`Skipping delegation credential ${oldCred.id} - workspace platform not found`);
            return null;
          }

          const newCred = await ctx.newDb.delegationCredential.create({
            data: {
              id: oldCred.id,
              workspacePlatformId: workspacePlatformId,
              serviceAccountKey: oldCred.serviceAccountKey,
              enabled: oldCred.enabled,
              lastEnabledAt: oldCred.lastEnabledAt,
              lastDisabledAt: oldCred.lastDisabledAt,
              organizationId: oldCred.organizationId,
              domain: oldCred.domain,
              createdAt: oldCred.createdAt,
              updatedAt: oldCred.updatedAt,
            },
          });

          ctx.idMappings.delegationCredentials[oldCred.id] = newCred.id;
          return newCred;
        } catch (error) {
          ctx.logError(`Failed to migrate delegation credential ${oldCred.id}`, error);
          return null;
        }
      })
    );
    return newCredentials.filter(Boolean);
  });

  ctx.log(`Migrated ${oldCredentials.length} delegation credentials`);
}

export async function migrateCredentials(ctx: MigrationContext) {
  ctx.log("Migrating Credentials...");

  const oldCredentials = await ctx.oldDb.credential.findMany();

  await ctx.processBatch(oldCredentials, async (batch) => {
    const newCredentials = await Promise.all(
      batch.map(async (oldCredential: any) => {
        try {
          const userId = oldCredential.userId ? ctx.idMappings.users[oldCredential.userId.toString()] : null;
          const calIdTeamId = oldCredential.teamId
            ? ctx.idMappings.calIdTeams[oldCredential.teamId.toString()]
            : null;

          const newCredential = await ctx.newDb.credential.create({
            data: {
              type: oldCredential.type,
              key: oldCredential.key,
              userId: userId,
              calIdTeamId: calIdTeamId,
              appId: oldCredential.appId,
              subscriptionId: oldCredential.subscriptionId,
              paymentStatus: oldCredential.paymentStatus,
              billingCycleStart: oldCredential.billingCycleStart,
              invalid: oldCredential.invalid,
              delegationCredentialId: oldCredential.delegationCredentialId,
            },
          });

          ctx.idMappings.credentials[oldCredential.id.toString()] = newCredential.id;
          return newCredential;
        } catch (error) {
          ctx.logError(`Failed to migrate credential ${oldCredential.id}`, error);
          return null;
        }
      })
    );
    return newCredentials.filter(Boolean);
  });

  ctx.log(`Migrated ${oldCredentials.length} credentials`);
}

export async function migrateSelectedCalendars(ctx: MigrationContext) {
  ctx.log("Migrating Selected Calendars...");

  const oldCalendars = await ctx.oldDb.selectedCalendar.findMany();

  await ctx.processBatch(oldCalendars, async (batch) => {
    const newCalendars = await Promise.all(
      batch.map(async (oldCalendar: any) => {
        try {
          const userId = ctx.idMappings.users[oldCalendar.userId.toString()];
          const credentialId = oldCalendar.credentialId
            ? ctx.idMappings.credentials[oldCalendar.credentialId.toString()]
            : null;
          const eventTypeId = oldCalendar.eventTypeId
            ? ctx.idMappings.eventTypes[oldCalendar.eventTypeId.toString()]
            : null;

          if (!userId) {
            ctx.log(`Skipping selected calendar ${oldCalendar.id} - user not found`);
            return null;
          }

          const newCalendar = await ctx.newDb.selectedCalendar.create({
            data: {
              id: oldCalendar.id,
              userId: userId,
              integration: oldCalendar.integration,
              externalId: oldCalendar.externalId,
              credentialId: credentialId,
              createdAt: oldCalendar.createdAt,
              updatedAt: oldCalendar.updatedAt,
              googleChannelId: oldCalendar.googleChannelId,
              googleChannelKind: oldCalendar.googleChannelKind,
              googleChannelResourceId: oldCalendar.googleChannelResourceId,
              googleChannelResourceUri: oldCalendar.googleChannelResourceUri,
              googleChannelExpiration: oldCalendar.googleChannelExpiration,
              delegationCredentialId: oldCalendar.delegationCredentialId,
              domainWideDelegationCredentialId: oldCalendar.domainWideDelegationCredentialId,
              error: oldCalendar.error,
              lastErrorAt: oldCalendar.lastErrorAt,
              watchAttempts: oldCalendar.watchAttempts,
              unwatchAttempts: oldCalendar.unwatchAttempts,
              maxAttempts: oldCalendar.maxAttempts,
              eventTypeId: eventTypeId,
            },
          });

          return newCalendar;
        } catch (error) {
          ctx.logError(`Failed to migrate selected calendar ${oldCalendar.id}`, error);
          return null;
        }
      })
    );
    return newCalendars.filter(Boolean);
  });

  ctx.log(`Migrated ${oldCalendars.length} selected calendars`);
}

export async function migrateDestinationCalendars(ctx: MigrationContext) {
  ctx.log("Migrating Destination Calendars...");

  const oldCalendars = await ctx.oldDb.destinationCalendar.findMany();

  await ctx.processBatch(oldCalendars, async (batch) => {
    const newCalendars = await Promise.all(
      batch.map(async (oldCalendar: any) => {
        try {
          const userId = oldCalendar.userId ? ctx.idMappings.users[oldCalendar.userId.toString()] : null;
          const eventTypeId = oldCalendar.eventTypeId
            ? ctx.idMappings.eventTypes[oldCalendar.eventTypeId.toString()]
            : null;
          const credentialId = oldCalendar.credentialId
            ? ctx.idMappings.credentials[oldCalendar.credentialId.toString()]
            : null;

          const newCalendar = await ctx.newDb.destinationCalendar.create({
            data: {
              integration: oldCalendar.integration,
              externalId: oldCalendar.externalId,
              primaryEmail: oldCalendar.primaryEmail,
              userId: userId,
              eventTypeId: eventTypeId,
              credentialId: credentialId,
              createdAt: oldCalendar.createdAt,
              updatedAt: oldCalendar.updatedAt,
              delegationCredentialId: oldCalendar.delegationCredentialId,
              domainWideDelegationCredentialId: oldCalendar.domainWideDelegationCredentialId,
            },
          });

          return newCalendar;
        } catch (error) {
          ctx.logError(`Failed to migrate destination calendar ${oldCalendar.id}`, error);
          return null;
        }
      })
    );
    return newCalendars.filter(Boolean);
  });

  ctx.log(`Migrated ${oldCalendars.length} destination calendars`);
}

export async function runPhase6(ctx: MigrationContext) {
  ctx.log("=== PHASE 6: Credentials & Calendars ===");
  await migrateWorkspacePlatforms(ctx);
  await migrateDelegationCredentials(ctx);
  await migrateCredentials(ctx);
  await migrateSelectedCalendars(ctx);
  await migrateDestinationCalendars(ctx);
}
