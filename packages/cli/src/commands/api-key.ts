import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess } from "../lib/output";

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
        if (options.daysValid) {
          const days = Number(options.daysValid);
          if (!Number.isInteger(days) || days <= 0) {
            outputError("--days-valid must be a positive integer.");
            return;
          }
          body.apiKeyDaysValid = days;
        }
        if (options.neverExpires) body.apiKeyNeverExpires = true;

        const response = await apiRequest<{ apiKey: string }>("/v2/api-keys/refresh", {
          method: "POST",
          body,
        });

        handleOutput(response.data, options, (data) => {
          if (data?.apiKey) {
            outputSuccess("API key refreshed successfully!");
            const masked = `${data.apiKey.slice(0, 7)}...${
              data.apiKey.length > 11 ? data.apiKey.slice(-4) : ""
            }`;
            console.log(`\nNew API Key: ${masked}`);
            console.log(
              "\nThe full key was returned in the API response. Use --json to capture it programmatically."
            );
          }
        });
      }
    );
}
