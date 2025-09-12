import type { MigrationContext } from "../types";

export async function migrateVerifiedNumbers(ctx: MigrationContext) {
  ctx.log("Migrating Verified Numbers...");

  const oldNumbers = await ctx.oldDb.verifiedNumber.findMany();

  await ctx.processBatch(oldNumbers, async (batch) => {
    const newNumbers = await Promise.all(
      batch.map(async (oldNumber: any) => {
        try {
          const userId = oldNumber.userId ? ctx.idMappings.users[oldNumber.userId.toString()] : null;
          const calIdTeamId = oldNumber.teamId
            ? ctx.idMappings.calIdTeams[oldNumber.teamId.toString()]
            : null;

          const newNumber = await ctx.newDb.verifiedNumber.create({
            data: {
              userId: userId,
              teamId: oldNumber.teamId,
              calIdTeamId: calIdTeamId,
              phoneNumber: oldNumber.phoneNumber,
            },
          });

          ctx.idMappings.verifiedNumbers[oldNumber.id.toString()] = newNumber.id;
          return newNumber;
        } catch (error) {
          ctx.logError(`Failed to migrate verified number ${oldNumber.id}`, error);
          return null;
        }
      })
    );
    return newNumbers.filter(Boolean);
  });

  ctx.log(`Migrated ${oldNumbers.length} verified numbers`);
}

export async function migrateVerifiedEmails(ctx: MigrationContext) {
  ctx.log("Migrating Verified Emails...");

  const oldEmails = await ctx.oldDb.verifiedEmail.findMany();

  await ctx.processBatch(oldEmails, async (batch) => {
    const newEmails = await Promise.all(
      batch.map(async (oldEmail: any) => {
        try {
          const userId = oldEmail.userId ? ctx.idMappings.users[oldEmail.userId.toString()] : null;
          const calIdTeamId = oldEmail.teamId ? ctx.idMappings.calIdTeams[oldEmail.teamId.toString()] : null;

          const newEmail = await ctx.newDb.verifiedEmail.create({
            data: {
              userId: userId,
              teamId: oldEmail.teamId,
              calIdTeamId: calIdTeamId,
              email: oldEmail.email,
            },
          });

          ctx.idMappings.verifiedEmails[oldEmail.id.toString()] = newEmail.id;
          return newEmail;
        } catch (error) {
          ctx.logError(`Failed to migrate verified email ${oldEmail.id}`, error);
          return null;
        }
      })
    );
    return newEmails.filter(Boolean);
  });

  ctx.log(`Migrated ${oldEmails.length} verified emails`);
}

export async function migrateVerificationTokens(ctx: MigrationContext) {
  ctx.log("Migrating Verification Tokens...");

  const oldTokens = await ctx.oldDb.verificationToken.findMany();

  await ctx.processBatch(oldTokens, async (batch) => {
    const newTokens = await Promise.all(
      batch.map(async (oldToken: any) => {
        try {
          const calIdTeamId = oldToken.teamId ? ctx.idMappings.calIdTeams[oldToken.teamId.toString()] : null;
          const secondaryEmailId = oldToken.secondaryEmailId
            ? ctx.idMappings.secondaryEmails[oldToken.secondaryEmailId.toString()]
            : null;

          const newToken = await ctx.newDb.verificationToken.create({
            data: {
              identifier: oldToken.identifier,
              token: oldToken.token,
              expires: oldToken.expires,
              expiresInDays: oldToken.expiresInDays,
              createdAt: oldToken.createdAt,
              updatedAt: oldToken.updatedAt,
              teamId: oldToken.teamId,
              calIdTeamId: calIdTeamId,
              secondaryEmailId: secondaryEmailId,
            },
          });

          return newToken;
        } catch (error) {
          ctx.logError(`Failed to migrate verification token ${oldToken.id}`, error);
          return null;
        }
      })
    );
    return newTokens.filter(Boolean);
  });

  ctx.log(`Migrated ${oldTokens.length} verification tokens`);
}

export async function migrateResetPasswordRequests(ctx: MigrationContext) {
  ctx.log("Migrating Reset Password Requests...");

  const oldRequests = await ctx.oldDb.resetPasswordRequest.findMany();

  await ctx.processBatch(oldRequests, async (batch) => {
    const newRequests = await Promise.all(
      batch.map(async (oldRequest: any) => {
        try {
          const newRequest = await ctx.newDb.resetPasswordRequest.create({
            data: {
              id: oldRequest.id,
              createdAt: oldRequest.createdAt,
              updatedAt: oldRequest.updatedAt,
              email: oldRequest.email,
              expires: oldRequest.expires,
            },
          });

          return newRequest;
        } catch (error) {
          ctx.logError(`Failed to migrate reset password request ${oldRequest.id}`, error);
          return null;
        }
      })
    );
    return newRequests.filter(Boolean);
  });

  ctx.log(`Migrated ${oldRequests.length} reset password requests`);
}

export async function runPhase15(ctx: MigrationContext) {
  ctx.log("=== PHASE 15: Verification & Security ===");
  await migrateVerifiedNumbers(ctx);
  await migrateVerifiedEmails(ctx);
  await migrateVerificationTokens(ctx);
  await migrateResetPasswordRequests(ctx);
}
