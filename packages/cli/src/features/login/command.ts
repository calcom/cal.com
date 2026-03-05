import type { Command } from "commander";
import { ApiKeyAuth, OAuthAuth, promptAuthMethod } from "../../shared/auth";
import { writeConfig } from "../../shared/config";
import { withErrorHandling } from "../../shared/errors";
import { renderLogoutSuccess } from "./output";

interface LoginOptions {
  apiKey?: string;
  oauth?: boolean;
  clientId?: string;
  clientSecret?: string;
  port?: number;
  apiUrl?: string;
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
    .action(async (options: LoginOptions) => {
      await withErrorHandling(async () => {
        const isOAuth = options.oauth || options.clientId || options.clientSecret;

        if (isOAuth) {
          const auth = new OAuthAuth({
            clientId: options.clientId,
            clientSecret: options.clientSecret,
            port: options.port,
            apiUrl: options.apiUrl,
          });
          await auth.login();
          return;
        }

        if (options.apiKey) {
          const auth = new ApiKeyAuth({ apiKey: options.apiKey, apiUrl: options.apiUrl });
          await auth.login();
          return;
        }

        const method = await promptAuthMethod();

        if (method === "oauth") {
          const auth = new OAuthAuth({ apiUrl: options.apiUrl });
          await auth.login();
        } else {
          const auth = new ApiKeyAuth({ apiUrl: options.apiUrl });
          await auth.login();
        }
      });
    });
}

export function registerLogoutCommand(program: Command): void {
  program
    .command("logout")
    .description("Remove stored Cal.com credentials")
    .action(async () => {
      await withErrorHandling(async () => {
        writeConfig({});
        renderLogoutSuccess();
      });
    });
}
