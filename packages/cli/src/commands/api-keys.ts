import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface ApiKey {
  id: number;
  userId: number;
  note: string | null;
  expiresAt: string | null;
  neverExpires: boolean;
  createdAt: string;
}

function formatExpiry(key: ApiKey): string {
  if (key.neverExpires) {
    return chalk.green("Never");
  }
  if (key.expiresAt) {
    return new Date(key.expiresAt).toLocaleDateString();
  }
  return "N/A";
}

export function registerApiKeysCommand(program: Command): void {
  const apiKeys = program.command("api-keys").description("Manage API keys");

  apiKeys
    .command("list")
    .description("List all API keys")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      const response = await apiRequest<ApiKey[]>("/v2/api-keys");

      handleOutput(response.data, options, (data) => {
        if (!data || data.length === 0) {
          console.log("No API keys found.");
          return;
        }
        outputTable(
          ["ID", "Note", "Expires", "Created"],
          data.map((k) => [
            String(k.id),
            k.note || "",
            formatExpiry(k),
            new Date(k.createdAt).toLocaleDateString(),
          ])
        );
      });
    });

  apiKeys
    .command("create")
    .description("Create a new API key")
    .option("--note <note>", "Note for the API key")
    .option("--expires-at <date>", "Expiration date (ISO 8601)")
    .option("--never-expires", "Key never expires")
    .option("--json", "Output as JSON")
    .action(
      async (options: { note?: string; expiresAt?: string; neverExpires?: boolean; json?: boolean }) => {
        const body: Record<string, unknown> = {};
        if (options.note) body.note = options.note;
        if (options.expiresAt) body.expiresAt = options.expiresAt;
        if (options.neverExpires) body.neverExpires = true;

        const response = await apiRequest<ApiKey>("/v2/api-keys", {
          method: "POST",
          body,
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to create API key.");
            return;
          }
          outputSuccess(`API key created (ID: ${data.id})`);
        });
      }
    );

  apiKeys
    .command("get <apiKeyId>")
    .description("Get an API key by ID")
    .option("--json", "Output as JSON")
    .action(async (apiKeyId: string, options: { json?: boolean }) => {
      const response = await apiRequest<ApiKey>(`/v2/api-keys/${apiKeyId}`);

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("API key not found.");
          return;
        }
        console.log(chalk.bold(`\nAPI Key #${data.id}`));
        console.log(`  Note:    ${data.note || "None"}`);
        console.log(`  Expires: ${formatExpiry(data)}`);
        console.log(`  Created: ${new Date(data.createdAt).toLocaleString()}`);
        console.log();
      });
    });

  apiKeys
    .command("delete <apiKeyId>")
    .description("Delete an API key")
    .option("--json", "Output as JSON")
    .action(async (apiKeyId: string, options: { json?: boolean }) => {
      await apiRequest<void>(`/v2/api-keys/${apiKeyId}`, { method: "DELETE" });

      if (options.json) {
        console.log(JSON.stringify({ status: "success", message: `API key ${apiKeyId} deleted` }));
      } else {
        outputSuccess(`API key ${apiKeyId} deleted.`);
      }
    });
}
