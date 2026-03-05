import type { Command } from "commander";
import { apiKeysControllerRefresh as refreshApiKey } from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { renderError } from "../../shared/output";
import { renderApiKeyRefreshed } from "./output";

export function registerApiKeysCommand(program: Command): void {
  program
    .command("api-key-refresh")
    .description("Refresh (rotate) the current API key")
    .option("--days-valid <days>", "Number of days the new key is valid (default: 30)")
    .option("--never-expires", "New key never expires")
    .option("--json", "Output as JSON")
    .action(async (options: { daysValid?: string; neverExpires?: boolean; json?: boolean }) => {
      await withErrorHandling(async () => {
        if (options.daysValid) {
          const days = Number(options.daysValid);
          if (!Number.isInteger(days) || days <= 0) {
            renderError("--days-valid must be a positive integer.");
            process.exit(1);
          }
        }

        await initializeClient();

        const { data: response } = await refreshApiKey({
          body: {
            apiKeyDaysValid: options.daysValid ? Number(options.daysValid) : undefined,
            apiKeyNeverExpires: options.neverExpires,
          },
          headers: { Authorization: "" },
        });

        renderApiKeyRefreshed(response?.data, options);
      });
    });
}
