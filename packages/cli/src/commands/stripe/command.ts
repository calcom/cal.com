import type { Command } from "commander";
import {
  stripeControllerCheck as checkStripe,
  stripeControllerRedirect as getStripeRedirect,
  stripeControllerSave as saveStripe,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderStripeCheck, renderStripeRedirect, renderStripeSaved } from "./output";

export function registerStripeCommand(program: Command): void {
  const stripeCmd = program.command("stripe").description("Manage Stripe integration for payments");

  stripeCmd
    .command("redirect")
    .description("Get Stripe OAuth redirect URL")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getStripeRedirect({
          headers: authHeader(),
        });
        renderStripeRedirect(response, options);
      });
    });

  stripeCmd
    .command("save")
    .description("Save Stripe credentials after OAuth callback")
    .requiredOption("--state <state>", "OAuth state parameter")
    .requiredOption("--code <code>", "OAuth authorization code")
    .option("--json", "Output as JSON")
    .action(async (options: { state: string; code: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await saveStripe({
          query: { state: options.state, code: options.code },
        });
        renderStripeSaved(response, options);
      });
    });

  stripeCmd
    .command("check")
    .description("Check Stripe integration status")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await checkStripe({
          headers: authHeader(),
        });
        renderStripeCheck(response, options);
      });
    });
}
