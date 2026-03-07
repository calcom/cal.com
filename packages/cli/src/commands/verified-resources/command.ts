import type { Command } from "commander";
import {
  userVerifiedResourcesControllerGetVerifiedEmailById as getVerifiedEmailById,
  userVerifiedResourcesControllerGetVerifiedEmails as getVerifiedEmails,
  userVerifiedResourcesControllerGetVerifiedPhoneById as getVerifiedPhoneById,
  userVerifiedResourcesControllerGetVerifiedPhoneNumbers as getVerifiedPhones,
  userVerifiedResourcesControllerRequestEmailVerificationCode as requestEmailCode,
  userVerifiedResourcesControllerRequestPhoneVerificationCode as requestPhoneCode,
  userVerifiedResourcesControllerVerifyEmail as verifyEmail,
  userVerifiedResourcesControllerVerifyPhoneNumber as verifyPhone,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderVerificationCodeRequested,
  renderVerified,
  renderVerifiedEmail,
  renderVerifiedEmailList,
  renderVerifiedPhone,
  renderVerifiedPhoneList,
} from "./output";

export function registerVerifiedResourcesCommand(program: Command): void {
  const vrCmd = program.command("verified-resources").description("Manage verified emails and phone numbers");

  // Emails sub-commands
  const emailsCmd = vrCmd.command("emails").description("Manage verified email addresses");

  emailsCmd
    .command("list")
    .description("List verified email addresses")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getVerifiedEmails({
          headers: authHeader(),
        });
        renderVerifiedEmailList(response?.data, options);
      });
    });

  emailsCmd
    .command("get <id>")
    .description("Get a verified email by ID")
    .option("--json", "Output as JSON")
    .action(async (id: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getVerifiedEmailById({
          path: { id: Number(id) },
          headers: authHeader(),
        });
        renderVerifiedEmail(response?.data, options);
      });
    });

  emailsCmd
    .command("request-code")
    .description("Request verification code for an email")
    .requiredOption("--email <email>", "Email address to verify")
    .option("--json", "Output as JSON")
    .action(async (options: { email: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        await requestEmailCode({
          body: { email: options.email },
          headers: authHeader(),
        });
        renderVerificationCodeRequested("email", options.email, options);
      });
    });

  emailsCmd
    .command("verify")
    .description("Verify an email with the verification code")
    .requiredOption("--email <email>", "Email address to verify")
    .requiredOption("--code <code>", "Verification code")
    .option("--json", "Output as JSON")
    .action(async (options: { email: string; code: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await verifyEmail({
          body: { email: options.email, code: options.code },
          headers: authHeader(),
        });
        renderVerified("email", options.email, response?.data, options);
      });
    });

  // Phones sub-commands
  const phonesCmd = vrCmd.command("phones").description("Manage verified phone numbers");

  phonesCmd
    .command("list")
    .description("List verified phone numbers")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getVerifiedPhones({
          headers: authHeader(),
        });
        renderVerifiedPhoneList(response?.data, options);
      });
    });

  phonesCmd
    .command("get <id>")
    .description("Get a verified phone by ID")
    .option("--json", "Output as JSON")
    .action(async (id: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getVerifiedPhoneById({
          path: { id: Number(id) },
          headers: authHeader(),
        });
        renderVerifiedPhone(response?.data, options);
      });
    });

  phonesCmd
    .command("request-code")
    .description("Request verification code for a phone number")
    .requiredOption("--phone <phone>", "Phone number to verify (E.164 format)")
    .option("--json", "Output as JSON")
    .action(async (options: { phone: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        await requestPhoneCode({
          body: { phone: options.phone },
          headers: authHeader(),
        });
        renderVerificationCodeRequested("phone", options.phone, options);
      });
    });

  phonesCmd
    .command("verify")
    .description("Verify a phone with the verification code")
    .requiredOption("--phone <phone>", "Phone number to verify")
    .requiredOption("--code <code>", "Verification code")
    .option("--json", "Output as JSON")
    .action(async (options: { phone: string; code: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await verifyPhone({
          body: { phone: options.phone, code: options.code },
          headers: authHeader(),
        });
        renderVerified("phone", options.phone, response?.data, options);
      });
    });
}
