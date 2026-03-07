import chalk from "chalk";
import { type OutputOptions, renderHeader, renderSuccess } from "../../shared/output";
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
    console.log(chalk.yellow("No Stripe connection status available."));
    return;
  }

  const status = response.status;
  const statusEntries = Object.entries(status);

  if (statusEntries.length === 0) {
    console.log(chalk.yellow("No connection details available."));
    return;
  }

  for (const [key, value] of statusEntries) {
    const displayValue =
      typeof value === "boolean" ? (value ? chalk.green("Yes") : chalk.red("No")) : String(value);
    console.log(`  ${chalk.bold(key)}: ${displayValue}`);
  }
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
    console.log(chalk.red("Failed to get Stripe connect URL."));
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
    console.log(chalk.red("Failed to save Stripe credentials."));
    return;
  }

  renderSuccess("Stripe credentials saved successfully.");

  if (response.url) {
    console.log(`\n  Redirect URL: ${chalk.cyan(response.url)}`);
  }
}
