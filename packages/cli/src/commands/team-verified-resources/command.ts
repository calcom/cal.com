import type { Command } from "commander";
import {
  meControllerGetMe as getMe,
  orgTeamsVerifiedResourcesControllerGetVerifiedEmailById as getVerifiedEmailById,
  orgTeamsVerifiedResourcesControllerGetVerifiedEmails as getVerifiedEmails,
  orgTeamsVerifiedResourcesControllerGetVerifiedPhoneById as getVerifiedPhoneById,
  orgTeamsVerifiedResourcesControllerGetVerifiedPhoneNumbers as getVerifiedPhones,
  orgTeamsVerifiedResourcesControllerRequestEmailVerificationCode as requestEmailCode,
  orgTeamsVerifiedResourcesControllerRequestPhoneVerificationCode as requestPhoneCode,
  orgTeamsVerifiedResourcesControllerVerifyEmail as verifyEmail,
  orgTeamsVerifiedResourcesControllerVerifyPhoneNumber as verifyPhone,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderEmailCodeRequested,
  renderEmailVerified,
  renderPhoneCodeRequested,
  renderPhoneVerified,
  renderVerifiedEmail,
  renderVerifiedEmailsList,
  renderVerifiedPhone,
  renderVerifiedPhonesList,
} from "./output";

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "Team verified resources require an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

function registerEmailCommands(emailsCmd: Command): void {
  emailsCmd
    .command("list <teamId>")
    .description("List all verified emails for a team")
    .option("--skip <skip>", "Number of items to skip")
    .option("--take <take>", "Maximum number of items to return")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { skip?: string; take?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getVerifiedEmails({
          path: { orgId, teamId: Number(teamId) },
          query: {
            skip: options.skip ? Number(options.skip) : undefined,
            take: options.take ? Number(options.take) : undefined,
          },
          headers: authHeader(),
        });

        renderVerifiedEmailsList(response, options);
      });
    });

  emailsCmd
    .command("get <teamId> <emailId>")
    .description("Get a verified email by ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, emailId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getVerifiedEmailById({
          path: { orgId, teamId: Number(teamId), id: Number(emailId) },
          headers: authHeader(),
        });

        renderVerifiedEmail(response, options);
      });
    });

  emailsCmd
    .command("request-code <teamId>")
    .description("Request a verification code for an email")
    .requiredOption("--email <email>", "Email address to verify")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { email: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await requestEmailCode({
          path: { orgId, teamId: Number(teamId) },
          body: { email: options.email },
          headers: authHeader(),
        });

        renderEmailCodeRequested(response, options.email, options);
      });
    });

  emailsCmd
    .command("verify <teamId>")
    .description("Verify an email with a verification code")
    .requiredOption("--email <email>", "Email address to verify")
    .requiredOption("--code <code>", "Verification code")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { email: string; code: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await verifyEmail({
          path: { orgId, teamId: Number(teamId) },
          body: { email: options.email, code: options.code },
          headers: authHeader(),
        });

        renderEmailVerified(response, options.email, options);
      });
    });
}

function registerPhoneCommands(phonesCmd: Command): void {
  phonesCmd
    .command("list <teamId>")
    .description("List all verified phone numbers for a team")
    .option("--skip <skip>", "Number of items to skip")
    .option("--take <take>", "Maximum number of items to return")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { skip?: string; take?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getVerifiedPhones({
          path: { orgId, teamId: Number(teamId) },
          query: {
            skip: options.skip ? Number(options.skip) : undefined,
            take: options.take ? Number(options.take) : undefined,
          },
          headers: authHeader(),
        });

        renderVerifiedPhonesList(response, options);
      });
    });

  phonesCmd
    .command("get <teamId> <phoneId>")
    .description("Get a verified phone number by ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, phoneId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getVerifiedPhoneById({
          path: { orgId, teamId: Number(teamId), id: Number(phoneId) },
          headers: authHeader(),
        });

        renderVerifiedPhone(response, options);
      });
    });

  phonesCmd
    .command("request-code <teamId>")
    .description("Request a verification code for a phone number")
    .requiredOption("--phone <phone>", "Phone number to verify")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { phone: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await requestPhoneCode({
          path: { orgId, teamId: Number(teamId) },
          body: { phone: options.phone },
          headers: authHeader(),
        });

        renderPhoneCodeRequested(response, options.phone, options);
      });
    });

  phonesCmd
    .command("verify <teamId>")
    .description("Verify a phone number with a verification code")
    .requiredOption("--phone <phone>", "Phone number to verify")
    .requiredOption("--code <code>", "Verification code")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { phone: string; code: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await verifyPhone({
          path: { orgId, teamId: Number(teamId) },
          body: { phone: options.phone, code: options.code },
          headers: authHeader(),
        });

        renderPhoneVerified(response, options.phone, options);
      });
    });
}

export function registerTeamVerifiedResourcesCommand(program: Command): void {
  const verifiedResourcesCmd = program
    .command("team-verified-resources")
    .description("Manage team verified emails and phone numbers");

  const emailsCmd = verifiedResourcesCmd.command("emails").description("Manage verified emails");
  registerEmailCommands(emailsCmd);

  const phonesCmd = verifiedResourcesCmd.command("phones").description("Manage verified phone numbers");
  registerPhoneCommands(phonesCmd);
}
