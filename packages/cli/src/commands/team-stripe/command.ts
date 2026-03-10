import type { Command } from "commander";
import {
  organizationsStripeControllerCheckTeamStripeConnection as checkStripeConnection,
  organizationsStripeControllerGetTeamStripeConnectUrl as getStripeConnectUrl,
  organizationsStripeControllerSave as saveStripeCredentials,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import {
  renderTeamStripeConnectionStatus,
  renderTeamStripeConnectUrl,
  renderTeamStripeSaved,
} from "./output";

export function registerTeamStripeCommand(program: Command): void {
  const teamStripe = program.command("team-stripe").description("Manage team Stripe integration");

  teamStripe
    .command("check <teamId>")
    .description("Check Stripe connection status for a team")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await checkStripeConnection({
          path: { orgId: Number(options.orgId), teamId: Number(teamId) },
        });

        renderTeamStripeConnectionStatus(teamId, response, options);
      });
    });

  teamStripe
    .command("connect-url <teamId>")
    .description("Get Stripe connect URL for a team")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--return-to <url>", "URL to return to after Stripe OAuth")
    .requiredOption("--on-error-return-to <url>", "URL to return to on OAuth error")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: { orgId: string; returnTo: string; onErrorReturnTo: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getStripeConnectUrl({
            path: {
              orgId: Number(options.orgId),
              teamId,
            },
            query: {
              returnTo: options.returnTo,
              onErrorReturnTo: options.onErrorReturnTo,
            },
            headers: {
              Authorization: "",
            },
          });

          renderTeamStripeConnectUrl(teamId, response, options);
        });
      }
    );

  teamStripe
    .command("save <teamId>")
    .description("Save Stripe credentials for a team after OAuth")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--code <code>", "OAuth authorization code from Stripe")
    .requiredOption("--state <state>", "OAuth state parameter")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { orgId: string; code: string; state: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await saveStripeCredentials({
          path: { orgId: Number(options.orgId), teamId: Number(teamId) },
          query: {
            code: options.code,
            state: options.state,
          },
        });

        renderTeamStripeSaved(teamId, response, options);
      });
    });
}
