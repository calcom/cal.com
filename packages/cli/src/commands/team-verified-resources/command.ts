import type { Command } from "commander";
import {
  teamsVerifiedResourcesControllerGetVerifiedEmailById as getTeamVerifiedEmailById,
  teamsVerifiedResourcesControllerGetVerifiedEmails as getTeamVerifiedEmails,
  teamsVerifiedResourcesControllerGetVerifiedPhoneById as getTeamVerifiedPhoneById,
  teamsVerifiedResourcesControllerGetVerifiedPhoneNumbers as getTeamVerifiedPhones,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderTeamVerifiedEmail,
  renderTeamVerifiedEmailList,
  renderTeamVerifiedPhone,
  renderTeamVerifiedPhoneList,
} from "./output";

function registerEmailCommands(teamVerifiedResourcesCmd: Command): void {
  const emailsCmd = teamVerifiedResourcesCmd.command("emails").description("Manage team verified emails");

  emailsCmd
    .command("list <teamId>")
    .description("List all verified emails for a team")
    .option("--take <n>", "Number of emails to return")
    .option("--skip <n>", "Number of emails to skip")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { take?: string; skip?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getTeamVerifiedEmails({
          path: { teamId: Number(teamId) },
          query: {
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: authHeader(),
        });

        renderTeamVerifiedEmailList(response?.data, options);
      });
    });

  emailsCmd
    .command("get <teamId> <emailId>")
    .description("Get a verified email by ID for a team")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, emailId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getTeamVerifiedEmailById({
          path: { teamId: Number(teamId), id: Number(emailId) },
          headers: authHeader(),
        });

        renderTeamVerifiedEmail(response?.data, options);
      });
    });
}

function registerPhoneCommands(teamVerifiedResourcesCmd: Command): void {
  const phonesCmd = teamVerifiedResourcesCmd.command("phones").description("Manage team verified phones");

  phonesCmd
    .command("list <teamId>")
    .description("List all verified phones for a team")
    .option("--take <n>", "Number of phones to return")
    .option("--skip <n>", "Number of phones to skip")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { take?: string; skip?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getTeamVerifiedPhones({
          path: { teamId: Number(teamId) },
          query: {
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: authHeader(),
        });

        renderTeamVerifiedPhoneList(response?.data, options);
      });
    });

  phonesCmd
    .command("get <teamId> <phoneId>")
    .description("Get a verified phone by ID for a team")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, phoneId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getTeamVerifiedPhoneById({
          path: { teamId: Number(teamId), id: Number(phoneId) },
          headers: authHeader(),
        });

        renderTeamVerifiedPhone(response?.data, options);
      });
    });
}

export function registerTeamVerifiedResourcesCommand(program: Command): void {
  const teamVerifiedResourcesCmd = program
    .command("team-verified-resources")
    .description("Manage team verified emails and phones");
  registerEmailCommands(teamVerifiedResourcesCmd);
  registerPhoneCommands(teamVerifiedResourcesCmd);
}
