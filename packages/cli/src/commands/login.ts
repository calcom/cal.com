import process from "node:process";
import * as readline from "node:readline";
import type { Command } from "commander";
import { readConfig, writeConfig } from "../lib/config";
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

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Authenticate with your Cal.com API key")
    .option("--api-key <key>", "API key (or will be prompted)")
    .option("--api-url <url>", "API base URL (default: https://api.cal.com)")
    .action(async (options: { apiKey?: string; apiUrl?: string }) => {
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
    });
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
