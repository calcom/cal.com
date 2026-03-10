import type { Command } from "commander";
import {
  orgTeamsVerifiedResourcesControllerGetVerifiedEmailById as getOrgTeamVerifiedEmailById,
  orgTeamsVerifiedResourcesControllerGetVerifiedEmails as getOrgTeamVerifiedEmails,
  orgTeamsVerifiedResourcesControllerGetVerifiedPhoneById as getOrgTeamVerifiedPhoneById,
  orgTeamsVerifiedResourcesControllerGetVerifiedPhoneNumbers as getOrgTeamVerifiedPhones,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderOrgTeamVerifiedEmail,
  renderOrgTeamVerifiedEmailList,
  renderOrgTeamVerifiedPhone,
  renderOrgTeamVerifiedPhoneList,
} from "./output";

function registerEmailCommands(orgTeamVerifiedResourcesCmd: Command): void {
  const emailsCmd = orgTeamVerifiedResourcesCmd
    .command("emails")
    .description("Manage org team verified emails");

  emailsCmd
    .command("list <orgId> <teamId>")
    .description("List all verified emails for an org team")
    .option("--take <n>", "Number of emails to return")
    .option("--skip <n>", "Number of emails to skip")
    .option("--json", "Output as JSON")
    .action(
      async (orgId: string, teamId: string, options: { take?: string; skip?: string; json?: boolean }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getOrgTeamVerifiedEmails({
            path: { orgId: Number(orgId), teamId: Number(teamId) },
            query: {
              take: options.take ? Number(options.take) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
            },
            headers: authHeader(),
          });

          renderOrgTeamVerifiedEmailList(response?.data, options);
        });
      }
    );

  emailsCmd
    .command("get <orgId> <teamId> <emailId>")
    .description("Get a verified email by ID for an org team")
    .option("--json", "Output as JSON")
    .action(async (orgId: string, teamId: string, emailId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getOrgTeamVerifiedEmailById({
          path: { orgId: Number(orgId), teamId: Number(teamId), id: Number(emailId) },
          headers: authHeader(),
        });

        renderOrgTeamVerifiedEmail(response?.data, options);
      });
    });
}

function registerPhoneCommands(orgTeamVerifiedResourcesCmd: Command): void {
  const phonesCmd = orgTeamVerifiedResourcesCmd
    .command("phones")
    .description("Manage org team verified phones");

  phonesCmd
    .command("list <orgId> <teamId>")
    .description("List all verified phones for an org team")
    .option("--take <n>", "Number of phones to return")
    .option("--skip <n>", "Number of phones to skip")
    .option("--json", "Output as JSON")
    .action(
      async (orgId: string, teamId: string, options: { take?: string; skip?: string; json?: boolean }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getOrgTeamVerifiedPhones({
            path: { orgId: Number(orgId), teamId: Number(teamId) },
            query: {
              take: options.take ? Number(options.take) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
            },
            headers: authHeader(),
          });

          renderOrgTeamVerifiedPhoneList(response?.data, options);
        });
      }
    );

  phonesCmd
    .command("get <orgId> <teamId> <phoneId>")
    .description("Get a verified phone by ID for an org team")
    .option("--json", "Output as JSON")
    .action(async (orgId: string, teamId: string, phoneId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getOrgTeamVerifiedPhoneById({
          path: { orgId: Number(orgId), teamId: Number(teamId), id: Number(phoneId) },
          headers: authHeader(),
        });

        renderOrgTeamVerifiedPhone(response?.data, options);
      });
    });
}

export function registerOrgTeamVerifiedResourcesCommand(program: Command): void {
  const orgTeamVerifiedResourcesCmd = program
    .command("org-team-verified-resources")
    .description("Manage organization team verified emails and phones");
  registerEmailCommands(orgTeamVerifiedResourcesCmd);
  registerPhoneCommands(orgTeamVerifiedResourcesCmd);
}
