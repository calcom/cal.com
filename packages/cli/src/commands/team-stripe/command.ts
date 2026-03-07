import type { Command } from "commander";
import {
  organizationsStripeControllerCheckTeamStripeConnection as checkStripeConnection,
  meControllerGetMe as getMe,
  organizationsStripeControllerGetTeamStripeConnectUrl as getStripeConnectUrl,
  organizationsStripeControllerSave as saveStripeCredentials,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderTeamStripeConnectionStatus,
  renderTeamStripeConnectUrl,
  renderTeamStripeSaved,
} from "./output";

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error("Team Stripe requires an organization. Your account does not belong to an organization.");
  }

  return me.organizationId;
}

export function registerTeamStripeCommand(program: Command): void {
  const teamStripe = program.command("team-stripe").description("Manage team Stripe integration");

  teamStripe
    .command("check <teamId>")
    .description("Check Stripe connection status for a team")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        await getOrgId();

        const { data: response } = await checkStripeConnection({
          path: { teamId: Number(teamId) },
        });

        renderTeamStripeConnectionStatus(teamId, response, options);
      });
    });

  teamStripe
    .command("connect-url <teamId>")
    .description("Get Stripe connect URL for a team")
    .requiredOption("--return-to <url>", "URL to return to after Stripe OAuth")
    .requiredOption("--on-error-return-to <url>", "URL to return to on OAuth error")
    .option("--json", "Output as JSON")
    .action(
      async (teamId: string, options: { returnTo: string; onErrorReturnTo: string; json?: boolean }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const { data: response } = await getStripeConnectUrl({
            path: {
              orgId: String(orgId),
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
    .requiredOption("--code <code>", "OAuth authorization code from Stripe")
    .requiredOption("--state <state>", "OAuth state parameter")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { code: string; state: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        await getOrgId();

        const { data: response } = await saveStripeCredentials({
          path: { teamId: Number(teamId) },
          query: {
            code: options.code,
            state: options.state,
          },
        });

        renderTeamStripeSaved(teamId, response, options);
      });
    });
}
