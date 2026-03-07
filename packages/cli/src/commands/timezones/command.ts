import type { Command } from "commander";
import { apiRequest } from "../../shared/api";
import { withErrorHandling } from "../../shared/errors";
import { renderTimezones } from "./output";
import type { TimezonesData } from "./types";

export function registerTimezonesCommand(program: Command): void {
  program
    .command("timezones")
    .description("List available timezones")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        const response = await apiRequest<TimezonesData>("/v2/timezones");
        renderTimezones(response.data, options);
      });
    });
}
