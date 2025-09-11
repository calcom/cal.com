import type { MigrationContext } from "../types";

export async function migrateApps(ctx: MigrationContext) {
  ctx.log("Migrating Apps...");

  const oldApps = await ctx.oldDb.app.findMany();

  await ctx.processBatch(oldApps, async (batch) => {
    const newApps = await Promise.all(
      batch.map(async (oldApp: any) => {
        try {
          const newApp = await ctx.newDb.app.create({
            data: {
              slug: oldApp.slug,
              dirName: oldApp.dirName,
              keys: oldApp.keys,
              categories: oldApp.categories,
              createdAt: oldApp.createdAt,
              updatedAt: oldApp.updatedAt,
              enabled: oldApp.enabled,
            },
          });
          return newApp;
        } catch (error) {
          ctx.logError(`Failed to migrate app ${oldApp.slug}`, error);
          return null;
        }
      })
    );
    return newApps.filter(Boolean);
  });

  ctx.log(`Migrated ${oldApps.length} apps`);
}

export async function migrateFeatures(ctx: MigrationContext) {
  ctx.log("Migrating Features...");

  const oldFeatures = await ctx.oldDb.feature.findMany();

  await ctx.processBatch(oldFeatures, async (batch) => {
    const newFeatures = await Promise.all(
      batch.map(async (oldFeature: any) => {
        try {
          const newFeature = await ctx.newDb.feature.create({
            data: {
              slug: oldFeature.slug,
              enabled: oldFeature.enabled,
              description: oldFeature.description,
              type: oldFeature.type,
              stale: oldFeature.stale,
              lastUsedAt: oldFeature.lastUsedAt,
              createdAt: oldFeature.createdAt,
              updatedAt: oldFeature.updatedAt,
              updatedBy: oldFeature.updatedBy,
            },
          });
          return newFeature;
        } catch (error) {
          ctx.logError(`Failed to migrate feature ${oldFeature.slug}`, error);
          return null;
        }
      })
    );
    return newFeatures.filter(Boolean);
  });

  ctx.log(`Migrated ${oldFeatures.length} features`);
}

export async function migrateUsers(ctx: MigrationContext) {
  ctx.log("Migrating Users...");

  const oldUsers = await ctx.oldDb.user.findMany({
    include: {
      password: true,
      travelSchedules: true,
    },
  });

  await ctx.processBatch(oldUsers, async (batch) => {
    const newUsers = await Promise.all(
      batch.map(async (oldUser: any) => {
        try {
          const newUser = await ctx.newDb.user.create({
            data: {
              username: oldUser.username,
              name: oldUser.name,
              email: oldUser.email,
              emailVerified: oldUser.emailVerified,
              bio: oldUser.bio,
              avatarUrl: oldUser.avatarUrl,
              timeZone: oldUser.timeZone || "Asia/Kolkata",
              weekStart: oldUser.weekStart || "Monday",
              startTime: oldUser.startTime,
              endTime: oldUser.endTime,
              bufferTime: oldUser.bufferTime,
              hideBranding: oldUser.hideBranding,
              theme: oldUser.theme,
              appTheme: oldUser.appTheme,
              createdDate: oldUser.createdDate,
              trialEndsAt: oldUser.trialEndsAt,
              lastActiveAt: oldUser.lastActiveAt,
              completedOnboarding: oldUser.completedOnboarding,
              locale: oldUser.locale,
              timeFormat: oldUser.timeFormat,
              twoFactorSecret: oldUser.twoFactorSecret,
              twoFactorEnabled: oldUser.twoFactorEnabled,
              backupCodes: oldUser.backupCodes,
              identityProvider: oldUser.identityProvider,
              identityProviderId: oldUser.identityProviderId,
              invitedTo: oldUser.invitedTo,
              brandColor: oldUser.brandColor,
              darkBrandColor: oldUser.darkBrandColor,
              allowDynamicBooking: oldUser.allowDynamicBooking,
              allowSEOIndexing: oldUser.allowSEOIndexing,
              receiveMonthlyDigestEmail: oldUser.receiveMonthlyDigestEmail,
              metadata: oldUser.metadata,
              verified: oldUser.verified,
              role: oldUser.role,
              disableImpersonation: oldUser.disableImpersonation,
              organizationId: oldUser.organizationId,
              locked: oldUser.locked,
              movedToProfileId: oldUser.movedToProfileId,
              isPlatformManaged: oldUser.isPlatformManaged,
              smsLockState: oldUser.smsLockState,
              smsLockReviewedByAdmin: oldUser.smsLockReviewedByAdmin,
              referralLinkId: oldUser.referralLinkId,
              creationSource: oldUser.creationSource,
              whitelistWorkflows: oldUser.whitelistWorkflows || false,
            },
          });

          // Create password if exists
          if (oldUser.password) {
            await ctx.newDb.userPassword.create({
              data: {
                userId: newUser.id,
                hash: oldUser.password.hash,
                salt: oldUser.password.salt,
              },
            });
          }

          // Create travel schedules
          if (oldUser.travelSchedules && oldUser.travelSchedules.length > 0) {
            await Promise.all(
              oldUser.travelSchedules.map((schedule: any) =>
                ctx.newDb.travelSchedule.create({
                  data: {
                    userId: newUser.id,
                    timeZone: schedule.timeZone,
                    startDate: schedule.startDate,
                    endDate: schedule.endDate,
                    prevTimeZone: schedule.prevTimeZone,
                  },
                })
              )
            );
          }

          ctx.idMappings.users[oldUser.id.toString()] = newUser.id;
          return newUser;
        } catch (error) {
          ctx.logError(`Failed to migrate user ${oldUser.id}`, error);
          return null;
        }
      })
    );
    return newUsers.filter(Boolean);
  });

  ctx.log(`Migrated ${oldUsers.length} users`);
}

export async function runPhase1(ctx: MigrationContext) {
  ctx.log("=== PHASE 1: Core Entities ===");
  await migrateApps(ctx);
  await migrateFeatures(ctx);
  await migrateUsers(ctx);
}
