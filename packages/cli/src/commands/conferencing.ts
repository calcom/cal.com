import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface ConferencingApp {
  id: number;
  type: string;
  userId: number | null;
  teamId: number | null;
  appId: string;
  invalid: boolean | null;
}

function formatInvalidStatus(invalid: boolean | null): string {
  if (invalid) {
    return chalk.red("Yes");
  }
  return chalk.green("No");
}

export function registerConferencingCommand(program: Command): void {
  const conferencing = program.command("conferencing").description("Manage conferencing apps");

  conferencing
    .command("list")
    .description("List connected conferencing apps")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<ConferencingApp[]>("/v2/conferencing");

      handleOutput(response.data, options, (data) => {
        if (!data || data.length === 0) {
          console.log("No conferencing apps connected.");
          return;
        }
        outputTable(
          ["ID", "App", "Type", "Invalid"],
          data.map((app) => [String(app.id), app.appId, app.type, formatInvalidStatus(app.invalid)])
        );
      });
    });

  conferencing
    .command("default")
    .description("Get the default conferencing app")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<ConferencingApp>("/v2/conferencing/default");

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("No default conferencing app set.");
          return;
        }
        console.log(chalk.bold(`\nDefault Conferencing App`));
        console.log(`  ID:   ${data.id}`);
        console.log(`  App:  ${data.appId}`);
        console.log(`  Type: ${data.type}`);
        console.log();
      });
    });

  conferencing
    .command("disconnect <app>")
    .description("Disconnect a conferencing app (e.g. google-meet, zoom)")
    .option("--credential-id <id>", "Credential ID to disconnect")
    .option("--json", "Output as JSON")
    .action(async (app: string, options: { credentialId?: string; json?: boolean }) => {
      const body: Record<string, unknown> = {};
      if (options.credentialId) body.id = Number(options.credentialId);

      const hasBody = Object.keys(body).length > 0;
      const requestBody = hasBody ? body : undefined;
      await apiRequest<void>(`/v2/conferencing/${app}/disconnect`, {
        method: "DELETE",
        body: requestBody,
      });

      if (options.json) {
        console.log(JSON.stringify({ status: "success", message: `Disconnected ${app}` }));
      } else {
        outputSuccess(`Conferencing app "${app}" disconnected.`);
      }
    });
}
