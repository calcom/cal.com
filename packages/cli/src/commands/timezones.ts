import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput } from "../lib/output";

interface TimezonesData {
  [key: string]: string;
}

export function registerTimezonesCommand(program: Command): void {
  program
    .command("timezones")
    .description("List available timezones")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<TimezonesData>("/v2/timezones");

      handleOutput(response.data, options, (data) => {
        if (!data) {
          console.log("No timezones returned.");
          return;
        }
        for (const [key, value] of Object.entries(data)) {
          console.log(`${key}: ${value}`);
        }
      });
    });
}
