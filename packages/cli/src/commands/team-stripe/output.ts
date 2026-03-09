import chalk from "chalk";
import {
  type OutputOptions,
  renderDetail,
  renderError,
  renderHeader,
  renderSuccess,
  renderWarning,
} from "../../shared/output";
import type { TeamStripeCheckResponse, TeamStripeConnectUrlResponse, TeamStripeSaveResponse } from "./types";

export function renderTeamStripeConnectionStatus(
  teamId: string,
  response: TeamStripeCheckResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  renderHeader(`Stripe Connection Status for Team ${teamId}`);

  if (!response || !response.status) {
    renderWarning("No Stripe connection status available.");
    return;
  }

  const status = response.status;
  const statusEntries = Object.entries(status);

  if (statusEntries.length === 0) {
    renderWarning("No connection details available.");
    return;
  }

  renderDetail(
    statusEntries.map(([key, value]) => [
      `${key}:`,
      typeof value === "boolean" ? (value ? "Yes" : "No") : String(value),
    ])
  );
}

export function renderTeamStripeConnectUrl(
  teamId: string,
  response: TeamStripeConnectUrlResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  renderHeader(`Stripe Connect URL for Team ${teamId}`);

  if (!response || response.status !== "success" || !response.data) {
    renderError("Failed to get Stripe connect URL.");
    return;
  }

  renderSuccess("Stripe connect URL generated successfully.");
  console.log(`\n  ${chalk.cyan(response.data.authUrl)}`);
  console.log("\nOpen this URL in your browser to connect your Stripe account.");
}

export function renderTeamStripeSaved(
  teamId: string,
  response: TeamStripeSaveResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  renderHeader(`Stripe Credentials Saved for Team ${teamId}`);

  if (!response) {
    renderError("Failed to save Stripe credentials.");
    return;
  }

  renderSuccess("Stripe credentials saved successfully.");

  if (response.url) {
    console.log(`\n  Redirect URL: ${chalk.cyan(response.url)}`);
  }
}
