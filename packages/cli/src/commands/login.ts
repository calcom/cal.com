import process from "node:process";
import * as readline from "node:readline";
import type { Command } from "commander";
import { readConfig, writeConfig } from "../lib/config";
import { performOAuthLogin } from "../lib/oauth";
import { outputSuccess } from "../lib/output";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function handleApiKeyLogin(options: { apiKey?: string; apiUrl?: string }): Promise<void> {
  const config = readConfig();

  const apiKey = options.apiKey || (await prompt("Enter your Cal.com API key: "));
  if (!apiKey) {
    console.error("API key is required.");
    process.exit(1);
  }

  config.apiKey = apiKey;
  if (options.apiUrl) {
    config.apiUrl = options.apiUrl;
  }

  writeConfig(config);
  outputSuccess("Logged in successfully. Credentials saved to ~/.calcom/config.json");
}

async function handleOAuthLogin(options: {
  clientId?: string;
  clientSecret?: string;
  port?: number;
  apiUrl?: string;
}): Promise<void> {
  const clientId = options.clientId || (await prompt("Enter your OAuth Client ID: "));
  if (!clientId) {
    console.error("OAuth Client ID is required.");
    process.exit(1);
  }

  const clientSecret = options.clientSecret || (await prompt("Enter your OAuth Client Secret: "));
  if (!clientSecret) {
    console.error("OAuth Client Secret is required.");
    process.exit(1);
  }

  if (options.apiUrl) {
    const config = readConfig();
    config.apiUrl = options.apiUrl;
    writeConfig(config);
  }

  await performOAuthLogin(clientId, clientSecret, options.port);
}

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Authenticate with Cal.com (API key or OAuth)")
    .option("--api-key <key>", "API key (skips interactive prompt)")
    .option("--oauth", "Use OAuth authentication flow")
    .option("--client-id <id>", "OAuth Client ID")
    .option("--client-secret <secret>", "OAuth Client Secret")
    .option("--port <port>", "Local port for OAuth callback (default: 8019)", Number.parseInt)
    .option("--api-url <url>", "API base URL (default: https://api.cal.com)")
    .action(
      async (options: {
        apiKey?: string;
        oauth?: boolean;
        clientId?: string;
        clientSecret?: string;
        port?: number;
        apiUrl?: string;
      }) => {
        if (options.oauth || options.clientId || options.clientSecret) {
          await handleOAuthLogin({
            clientId: options.clientId,
            clientSecret: options.clientSecret,
            port: options.port,
            apiUrl: options.apiUrl,
          });
          return;
        }

        if (options.apiKey) {
          await handleApiKeyLogin({ apiKey: options.apiKey, apiUrl: options.apiUrl });
          return;
        }

        const method = await prompt(
          "Choose authentication method:\n  1) API Key\n  2) OAuth\nEnter choice (1 or 2): "
        );

        if (method === "2") {
          await handleOAuthLogin({ apiUrl: options.apiUrl });
        } else {
          await handleApiKeyLogin({ apiUrl: options.apiUrl });
        }
      }
    );
}

export function registerLogoutCommand(program: Command): void {
  program
    .command("logout")
    .description("Remove stored Cal.com credentials")
    .action(() => {
      writeConfig({});
      outputSuccess("Logged out. Credentials removed from ~/.calcom/config.json");
    });
}
