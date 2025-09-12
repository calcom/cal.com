import type { MigrationContext } from "../types";

export async function migrateAccounts(ctx: MigrationContext) {
  ctx.log("Migrating Accounts...");

  const oldAccounts = await ctx.oldDb.account.findMany();

  await ctx.processBatch(oldAccounts, async (batch) => {
    const newAccounts = await Promise.all(
      batch.map(async (oldAccount: any) => {
        try {
          const userId = ctx.idMappings.users[oldAccount.userId.toString()];
          if (!userId) {
            ctx.log(`Skipping account ${oldAccount.id} - user not found`);
            return null;
          }

          const newAccount = await ctx.newDb.account.create({
            data: {
              id: oldAccount.id,
              userId: userId,
              type: oldAccount.type,
              provider: oldAccount.provider,
              providerAccountId: oldAccount.providerAccountId,
              providerEmail: oldAccount.providerEmail,
              refresh_token: oldAccount.refresh_token,
              access_token: oldAccount.access_token,
              expires_at: oldAccount.expires_at,
              token_type: oldAccount.token_type,
              scope: oldAccount.scope,
              id_token: oldAccount.id_token,
              session_state: oldAccount.session_state,
            },
          });

          ctx.idMappings.accounts[oldAccount.id] = newAccount.id;
          return newAccount;
        } catch (error) {
          ctx.logError(`Failed to migrate account ${oldAccount.id}`, error);
          return null;
        }
      })
    );
    return newAccounts.filter(Boolean);
  });

  ctx.log(`Migrated ${oldAccounts.length} accounts`);
}

export async function migrateSessions(ctx: MigrationContext) {
  ctx.log("Migrating Sessions...");

  const oldSessions = await ctx.oldDb.session.findMany();

  await ctx.processBatch(oldSessions, async (batch) => {
    const newSessions = await Promise.all(
      batch.map(async (oldSession: any) => {
        try {
          const userId = ctx.idMappings.users[oldSession.userId.toString()];
          if (!userId) {
            ctx.log(`Skipping session ${oldSession.id} - user not found`);
            return null;
          }

          const newSession = await ctx.newDb.session.create({
            data: {
              id: oldSession.id,
              sessionToken: oldSession.sessionToken,
              userId: userId,
              expires: oldSession.expires,
            },
          });

          ctx.idMappings.sessions[oldSession.id] = newSession.id;
          return newSession;
        } catch (error) {
          ctx.logError(`Failed to migrate session ${oldSession.id}`, error);
          return null;
        }
      })
    );
    return newSessions.filter(Boolean);
  });

  ctx.log(`Migrated ${oldSessions.length} sessions`);
}

export async function migrateSecondaryEmails(ctx: MigrationContext) {
  ctx.log("Migrating Secondary Emails...");

  const oldSecondaryEmails = await ctx.oldDb.secondaryEmail.findMany();

  await ctx.processBatch(oldSecondaryEmails, async (batch) => {
    const newSecondaryEmails = await Promise.all(
      batch.map(async (oldEmail: any) => {
        try {
          const userId = ctx.idMappings.users[oldEmail.userId.toString()];
          if (!userId) {
            ctx.log(`Skipping secondary email ${oldEmail.id} - user not found`);
            return null;
          }

          const newEmail = await ctx.newDb.secondaryEmail.create({
            data: {
              userId: userId,
              email: oldEmail.email,
              emailVerified: oldEmail.emailVerified,
            },
          });

          ctx.idMappings.secondaryEmails[oldEmail.id.toString()] = newEmail.id;
          return newEmail;
        } catch (error) {
          ctx.logError(`Failed to migrate secondary email ${oldEmail.id}`, error);
          return null;
        }
      })
    );
    return newSecondaryEmails.filter(Boolean);
  });

  ctx.log(`Migrated ${oldSecondaryEmails.length} secondary emails`);
}

export async function runPhase2(ctx: MigrationContext) {
  ctx.log("=== PHASE 2: User Auth & Session ===");
  await migrateAccounts(ctx);
  await migrateSessions(ctx);
  await migrateSecondaryEmails(ctx);
}
