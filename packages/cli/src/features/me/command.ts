import type { Command } from "commander";
import { meControllerGetMe as getMe } from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { renderProfile } from "./output";

export function registerMeCommand(program: Command): void {
  program
    .command("me")
    .alias("whoami")
    .description("Get your Cal.com profile")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getMe({ headers: { Authorization: "" } });
        renderProfile(response?.data, options);
      });
    });
}
