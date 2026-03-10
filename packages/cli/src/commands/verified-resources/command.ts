import type { Command } from "commander";
import {
  userVerifiedResourcesControllerGetVerifiedEmailById as getVerifiedEmailById,
  userVerifiedResourcesControllerGetVerifiedEmails as getVerifiedEmails,
  userVerifiedResourcesControllerGetVerifiedPhoneById as getVerifiedPhoneById,
  userVerifiedResourcesControllerGetVerifiedPhoneNumbers as getVerifiedPhones,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderVerifiedEmail,
  renderVerifiedEmailList,
  renderVerifiedPhone,
  renderVerifiedPhoneList,
} from "./output";

function registerEmailCommands(verifiedResourcesCmd: Command): void {
  const emailsCmd = verifiedResourcesCmd.command("emails").description("Manage verified emails");

  emailsCmd
    .command("list")
    .description("List all verified emails")
    .option("--take <n>", "Number of emails to return")
    .option("--skip <n>", "Number of emails to skip")
    .option("--json", "Output as JSON")
    .action(async (options: { take?: string; skip?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getVerifiedEmails({
          query: {
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: authHeader(),
        });

        renderVerifiedEmailList(response?.data, options);
      });
    });

  emailsCmd
    .command("get <emailId>")
    .description("Get a verified email by ID")
    .option("--json", "Output as JSON")
    .action(async (emailId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getVerifiedEmailById({
          path: { id: Number(emailId) },
          headers: authHeader(),
        });

        renderVerifiedEmail(response?.data, options);
      });
    });
}

function registerPhoneCommands(verifiedResourcesCmd: Command): void {
  const phonesCmd = verifiedResourcesCmd.command("phones").description("Manage verified phones");

  phonesCmd
    .command("list")
    .description("List all verified phones")
    .option("--take <n>", "Number of phones to return")
    .option("--skip <n>", "Number of phones to skip")
    .option("--json", "Output as JSON")
    .action(async (options: { take?: string; skip?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getVerifiedPhones({
          query: {
            take: options.take ? Number(options.take) : undefined,
            skip: options.skip ? Number(options.skip) : undefined,
          },
          headers: authHeader(),
        });

        renderVerifiedPhoneList(response?.data, options);
      });
    });

  phonesCmd
    .command("get <phoneId>")
    .description("Get a verified phone by ID")
    .option("--json", "Output as JSON")
    .action(async (phoneId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getVerifiedPhoneById({
          path: { id: Number(phoneId) },
          headers: authHeader(),
        });

        renderVerifiedPhone(response?.data, options);
      });
    });
}

export function registerVerifiedResourcesCommand(program: Command): void {
  const verifiedResourcesCmd = program
    .command("verified-resources")
    .description("Manage verified emails and phones");
  registerEmailCommands(verifiedResourcesCmd);
  registerPhoneCommands(verifiedResourcesCmd);
}
