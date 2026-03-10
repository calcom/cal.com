import type { Command } from "commander";
import {
  organizationsConferencingControllerConnectTeamApp as connectTeamApp,
  organizationsConferencingControllerDisconnectTeamApp as disconnectTeamApp,
  organizationsConferencingControllerGetTeamOAuthUrl as getTeamOAuthUrl,
  organizationsConferencingControllerListTeamConferencingApps as listTeamConferencingApps,
  organizationsConferencingControllerSetTeamDefaultApp as setTeamDefaultApp,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import {
  renderTeamConferencingAppConnected,
  renderTeamConferencingAppDisconnected,
  renderTeamConferencingAppList,
  renderTeamConferencingOAuthUrl,
  renderTeamDefaultConferencingAppSet,
} from "./output";
import type {
  TeamConferencingConnectAppType,
  TeamConferencingDefaultAppType,
  TeamConferencingDisconnectAppType,
  TeamConferencingOAuthAppType,
} from "./types";

export function registerTeamConferencingCommand(program: Command): void {
  const teamConferencing = program.command("team-conferencing").description("Manage team conferencing apps");

  teamConferencing
    .command("list <teamId>")
    .description("List team conferencing apps")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await listTeamConferencingApps({
          path: { orgId: Number(options.orgId), teamId: Number(teamId) },
        });

        renderTeamConferencingAppList(response?.data, options);
      });
    });

  teamConferencing
    .command("set-default <teamId> <app>")
    .description("Set the default conferencing app for a team (google-meet, zoom, msteams, daily-video)")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, app: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await setTeamDefaultApp({
          path: {
            orgId: Number(options.orgId),
            teamId: Number(teamId),
            app: app as TeamConferencingDefaultAppType,
          },
        });

        renderTeamDefaultConferencingAppSet(app, response, options);
      });
    });

  teamConferencing
    .command("connect <teamId> <app>")
    .description("Connect a conferencing app for a team (google-meet)")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, app: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await connectTeamApp({
          path: {
            orgId: Number(options.orgId),
            teamId: Number(teamId),
            app: app as TeamConferencingConnectAppType,
          },
        });

        renderTeamConferencingAppConnected(app, options);
      });
    });

  teamConferencing
    .command("disconnect <teamId> <app>")
    .description("Disconnect a conferencing app from a team (google-meet, zoom, msteams)")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, app: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await disconnectTeamApp({
          path: {
            orgId: Number(options.orgId),
            teamId: Number(teamId),
            app: app as TeamConferencingDisconnectAppType,
          },
        });

        renderTeamConferencingAppDisconnected(app, response, options);
      });
    });

  teamConferencing
    .command("connect-url <teamId> <app>")
    .description("Get OAuth URL for a conferencing app (zoom, msteams)")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--return-to <url>", "URL to return to after OAuth")
    .requiredOption("--on-error-return-to <url>", "URL to return to on OAuth error")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        app: string,
        options: { orgId: string; returnTo: string; onErrorReturnTo: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getTeamOAuthUrl({
            path: {
              orgId: Number(options.orgId),
              teamId,
              app: app as TeamConferencingOAuthAppType,
            },
            query: {
              returnTo: options.returnTo,
              onErrorReturnTo: options.onErrorReturnTo,
            },
            headers: {
              Authorization: "",
            },
          });

          renderTeamConferencingOAuthUrl(app, response, options);
        });
      }
    );
}
