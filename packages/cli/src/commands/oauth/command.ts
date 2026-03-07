import type { Command } from "commander";
import {
  oAuth2ControllerGetClient as getOAuth2Client,
  oAuth2ControllerToken as getOAuth2Token,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { renderOAuth2Client, renderOAuth2Tokens } from "./output";

export function registerOAuthCommand(program: Command): void {
  const oauthCmd = program.command("oauth").description("OAuth2 authentication management");

  oauthCmd
    .command("client <clientId>")
    .description("Get OAuth2 client information")
    .option("--json", "Output as JSON")
    .action(async (clientId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getOAuth2Client({
          path: { clientId },
        });

        renderOAuth2Client(response, options);
      });
    });

  oauthCmd
    .command("token")
    .description("Exchange authorization code or refresh token for access tokens")
    .requiredOption("--grant-type <type>", "Grant type: authorization_code or refresh_token")
    .option("--client-id <clientId>", "OAuth2 client ID")
    .option("--client-secret <secret>", "OAuth2 client secret (for confidential clients)")
    .option("--code <code>", "Authorization code (for authorization_code grant)")
    .option("--redirect-uri <uri>", "Redirect URI (for authorization_code grant)")
    .option("--code-verifier <verifier>", "PKCE code verifier (for public clients)")
    .option("--refresh-token <token>", "Refresh token (for refresh_token grant)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        grantType: string;
        clientId?: string;
        clientSecret?: string;
        code?: string;
        redirectUri?: string;
        codeVerifier?: string;
        refreshToken?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          let body: Record<string, string> = {};

          if (options.grantType === "authorization_code") {
            if (!options.code || !options.redirectUri) {
              throw new Error("--code and --redirect-uri are required for authorization_code grant");
            }

            if (options.clientSecret) {
              // Confidential client
              body = {
                grant_type: "authorization_code",
                client_id: options.clientId || "",
                client_secret: options.clientSecret,
                code: options.code,
                redirect_uri: options.redirectUri,
              };
            } else if (options.codeVerifier) {
              // Public client with PKCE
              body = {
                grant_type: "authorization_code",
                client_id: options.clientId || "",
                code: options.code,
                redirect_uri: options.redirectUri,
                code_verifier: options.codeVerifier,
              };
            } else {
              throw new Error(
                "Either --client-secret (confidential) or --code-verifier (PKCE) is required"
              );
            }
          } else if (options.grantType === "refresh_token") {
            if (!options.refreshToken) {
              throw new Error("--refresh-token is required for refresh_token grant");
            }

            if (options.clientSecret) {
              // Confidential client
              body = {
                grant_type: "refresh_token",
                client_id: options.clientId || "",
                client_secret: options.clientSecret,
                refresh_token: options.refreshToken,
              };
            } else {
              // Public client
              body = {
                grant_type: "refresh_token",
                client_id: options.clientId || "",
                refresh_token: options.refreshToken,
              };
            }
          } else {
            throw new Error("--grant-type must be 'authorization_code' or 'refresh_token'");
          }

          const { data: response } = await getOAuth2Token({
            body: body as Parameters<typeof getOAuth2Token>[0]["body"],
          });

          renderOAuth2Tokens(response, options);
        });
      }
    );
}
