import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputSuccess } from "../lib/output";

export function registerApiKeysCommand(program: Command): void {
  program
    .command("api-key-refresh")
    .description("Refresh (rotate) the current API key")
    .option("--days-valid <days>", "Number of days the new key is valid (default: 30)")
    .option("--never-expires", "New key never expires")
    .option("--json", "Output as JSON")
    .action(
      async (options: { daysValid?: string; neverExpires?: boolean; json?: boolean }) => {
        const body: Record<string, unknown> = {};
        if (options.daysValid) body.apiKeyDaysValid = Number(options.daysValid);
        if (options.neverExpires) body.apiKeyNeverExpires = true;

        const response = await apiRequest<{ apiKey: string }>("/v2/api-keys/refresh", {
          method: "POST",
          body,
        });

        handleOutput(response.data, options, (data) => {
          if (data?.apiKey) {
            outputSuccess("API key refreshed successfully!");
            console.log(`\nNew API Key: ${data.apiKey}`);
            console.log("\nPlease update your stored credentials with this new key.");
          }
        });
      }
    );
}
