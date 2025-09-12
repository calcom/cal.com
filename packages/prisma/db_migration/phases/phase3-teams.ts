import type { MigrationContext } from "../types";

export async function migrateCalIdTeams(ctx: MigrationContext) {
  ctx.log("Migrating Team → CalIdTeam...");

  const oldTeams = await ctx.oldDb.team.findMany({
    include: {
      organizationSettings: true,
      platformBilling: true,
    },
  });

  await ctx.processBatch(oldTeams, async (batch) => {
    const newTeams = await Promise.all(
      batch.map(async (oldTeam: any) => {
        try {
          const newTeam = await ctx.newDb.calIdTeam.create({
            data: {
              name: oldTeam.name,
              slug: oldTeam.slug,
              logoUrl: oldTeam.logoUrl,
              bio: oldTeam.bio,
              hideTeamBranding: oldTeam.hideBranding || false,
              hideTeamProfileLink: oldTeam.hideBookATeamMember || false,
              isTeamPrivate: oldTeam.isPrivate || false,
              hideBookATeamMember: oldTeam.hideBookATeamMember || false,
              metadata: oldTeam.metadata,
              theme: oldTeam.theme,
              brandColor: oldTeam.brandColor,
              darkBrandColor: oldTeam.darkBrandColor,
              timeFormat: oldTeam.timeFormat,
              timeZone: oldTeam.timeZone || "Asia/Kolkata",
              weekStart: oldTeam.weekStart || "Monday",
              bookingFrequency: oldTeam.bookingLimits,
              createdAt: oldTeam.createdAt,
              updatedAt: new Date(),
            },
          });

          ctx.idMappings.calIdTeams[oldTeam.id.toString()] = newTeam.id;
          return newTeam;
        } catch (error) {
          ctx.logError(`Failed to migrate team ${oldTeam.id}`, error);
          return null;
        }
      })
    );
    return newTeams.filter(Boolean);
  });

  ctx.log(`Migrated ${oldTeams.length} teams to CalIdTeams`);
}

export async function migrateOrganizationSettings(ctx: MigrationContext) {
  ctx.log("Migrating Organization Settings...");

  const oldOrgSettings = await ctx.oldDb.organizationSettings.findMany();

  await ctx.processBatch(oldOrgSettings, async (batch) => {
    const newOrgSettings = await Promise.all(
      batch.map(async (oldSetting: any) => {
        try {
          const newSetting = await ctx.newDb.organizationSettings.create({
            data: {
              organizationId: oldSetting.organizationId,
              isOrganizationConfigured: oldSetting.isOrganizationConfigured,
              isOrganizationVerified: oldSetting.isOrganizationVerified,
              orgAutoAcceptEmail: oldSetting.orgAutoAcceptEmail,
              lockEventTypeCreationForUsers: oldSetting.lockEventTypeCreationForUsers,
              adminGetsNoSlotsNotification: oldSetting.adminGetsNoSlotsNotification,
              isAdminReviewed: oldSetting.isAdminReviewed,
              isAdminAPIEnabled: oldSetting.isAdminAPIEnabled,
              allowSEOIndexing: oldSetting.allowSEOIndexing,
              orgProfileRedirectsToVerifiedDomain: oldSetting.orgProfileRedirectsToVerifiedDomain,
              disablePhoneOnlySMSNotifications: oldSetting.disablePhoneOnlySMSNotifications,
            },
          });
          return newSetting;
        } catch (error) {
          ctx.logError(`Failed to migrate organization settings ${oldSetting.id}`, error);
          return null;
        }
      })
    );
    return newOrgSettings.filter(Boolean);
  });

  ctx.log(`Migrated ${oldOrgSettings.length} organization settings`);
}

export async function runPhase3(ctx: MigrationContext) {
  ctx.log("=== PHASE 3: Organizations/Teams ===");
  await migrateCalIdTeams(ctx);
  await migrateOrganizationSettings(ctx);
}
