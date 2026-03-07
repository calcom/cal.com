import chalk from "chalk";
import { type OutputOptions, renderHeader, renderSuccess } from "../../shared/output";
import type { StripeCheckResponse, StripeRedirectResponse, StripeSaveResponse } from "./types";

export function renderStripeRedirect(
  data: StripeRedirectResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const url = data?.data?.authUrl;
  if (!url) {
    console.log("No redirect URL returned.");
    return;
  }
  renderHeader("Stripe OAuth");
  console.log(`Visit this URL to connect your Stripe account:\n`);
  console.log(chalk.cyan(url));
}

export function renderStripeSaved(
  data: StripeSaveResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  renderSuccess("Stripe credentials saved successfully.");
  if (data?.url) {
    console.log(`\nRedirect URL: ${chalk.cyan(data.url)}`);
  }
}

export function renderStripeCheck(
  data: StripeCheckResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  renderHeader("Stripe Integration Status");
  if (!data?.status) {
    console.log(chalk.yellow("No status information available."));
    return;
  }
  const statusEntries = Object.entries(data.status);
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
