import type { Command } from "commander";
import {
  organizationsConferencingControllerConnectTeamApp as connectTeamApp,
  organizationsConferencingControllerDisconnectTeamApp as disconnectTeamApp,
  meControllerGetMe as getMe,
  organizationsConferencingControllerGetTeamOAuthUrl as getTeamOAuthUrl,
  organizationsConferencingControllerListTeamConferencingApps as listTeamConferencingApps,
  organizationsConferencingControllerSetTeamDefaultApp as setTeamDefaultApp,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
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

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "Team conferencing requires an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

export function registerTeamConferencingCommand(program: Command): void {
  const teamConferencing = program.command("team-conferencing").description("Manage team conferencing apps");

  teamConferencing
    .command("list <teamId>")
    .description("List team conferencing apps")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await listTeamConferencingApps({
          path: { orgId, teamId: Number(teamId) },
        });

        renderTeamConferencingAppList(response?.data, options);
      });
    });

  teamConferencing
    .command("set-default <teamId> <app>")
    .description("Set the default conferencing app for a team (google-meet, zoom, msteams, daily-video)")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, app: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await setTeamDefaultApp({
          path: {
            orgId,
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
    .option("--json", "Output as JSON")
    .action(async (teamId: string, app: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        await connectTeamApp({
          path: {
            orgId,
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
    .option("--json", "Output as JSON")
    .action(async (teamId: string, app: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await disconnectTeamApp({
          path: {
            orgId,
            teamId: Number(teamId),
            app: app as TeamConferencingDisconnectAppType,
          },
        });

        renderTeamConferencingAppDisconnected(app, response, options);
      });
    });

  teamConferencing
    .command("oauth-url <teamId> <app>")
    .description("Get OAuth URL for a conferencing app (zoom, msteams)")
    .requiredOption("--return-to <url>", "URL to return to after OAuth")
    .requiredOption("--on-error-return-to <url>", "URL to return to on OAuth error")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        app: string,
        options: { returnTo: string; onErrorReturnTo: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const { data: response } = await getTeamOAuthUrl({
            path: {
              orgId: String(orgId),
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
