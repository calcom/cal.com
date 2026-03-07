import type { Command } from "commander";
import {
  conferencingControllerDisconnect as disconnectConferencingApp,
  conferencingControllerGetDefault as getDefaultConferencingApp,
  conferencingControllerListInstalledConferencingApps as listConferencingApps,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderConferencingAppDisconnected,
  renderConferencingAppList,
  renderDefaultConferencingApp,
} from "./output";
import type { ConferencingAppType } from "./types";

export function registerConferencingCommand(program: Command): void {
  const conferencing = program.command("conferencing").description("Manage conferencing apps");

  conferencing
    .command("list")
    .description("List connected conferencing apps")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await listConferencingApps({
          headers: authHeader(),
        });

        renderConferencingAppList(response?.data, options);
      });
    });

  conferencing
    .command("default")
    .description("Get the default conferencing app")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getDefaultConferencingApp({
          headers: authHeader(),
        });

        renderDefaultConferencingApp(response?.data, options);
      });
    });

  conferencing
    .command("disconnect <app>")
    .description("Disconnect a conferencing app (e.g. google-meet, zoom, msteams)")
    .option("--json", "Output as JSON")
    .action(async (app: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await disconnectConferencingApp({
          headers: authHeader(),
          path: { app: app as ConferencingAppType },
        });

        renderConferencingAppDisconnected(app, response, options);
      });
    });
}
