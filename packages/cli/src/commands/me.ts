import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputTable } from "../lib/output";

interface MeData {
  id: number;
  username: string;
  name: string;
  email: string;
  timeZone: string;
  defaultScheduleId: number | null;
  weekStart: string;
  createdDate: string;
}

function formatDefaultSchedule(id: number | null): string {
  if (id) {
    return String(id);
  }
  return "None";
}

export function registerMeCommand(program: Command): void {
  program
    .command("me")
    .alias("whoami")
    .description("Get your Cal.com profile")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<MeData>("/v2/me");

      handleOutput(response.data, options, (data) => {
        if (!data) {
          console.log("No profile data returned.");
          return;
        }
        outputTable(
          ["Field", "Value"],
          [
            ["ID", String(data.id)],
            ["Username", data.username || ""],
            ["Name", data.name || ""],
            ["Email", data.email || ""],
            ["Timezone", data.timeZone || ""],
            ["Week Start", data.weekStart || ""],
            ["Default Schedule", formatDefaultSchedule(data.defaultScheduleId)],
          ]
        );
      });
    });
}
