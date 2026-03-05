import chalk from "chalk";
import { renderSuccess, renderTable, type OutputOptions } from "../../shared/output";
import type { ConferencingApp, DefaultConferencingApp } from "./types";

function formatInvalidStatus(invalid: boolean | null | undefined): string {
  if (invalid) {
    return chalk.red("Yes");
  }
  return chalk.green("No");
}

export function renderConferencingAppList(
  apps: ConferencingApp[] | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(apps, null, 2));
    return;
  }

  if (!apps || apps.length === 0) {
    console.log("No conferencing apps connected.");
    return;
  }

  renderTable(
    ["ID", "Type", "User ID", "Invalid"],
    apps.map((app) => [String(app.id), app.type, String(app.userId), formatInvalidStatus(app.invalid)])
  );
}

export function renderDefaultConferencingApp(
  app: DefaultConferencingApp | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(app, null, 2));
    return;
  }

  if (!app || !app.appSlug) {
    console.log("No default conferencing app set.");
    return;
  }

  console.log(chalk.bold(`\nDefault Conferencing App`));
  console.log(`  App:  ${app.appSlug}`);
  if (app.appLink) {
    console.log(`  Link: ${app.appLink}`);
  }
  console.log();
}

export function renderConferencingAppDisconnected(
  app: string,
  response: unknown,
  { json }: OutputOptions = {}
): void {
  if (json) {
    const output = { status: "success", message: `Disconnected ${app}` };
    if (response && typeof response === "object") {
      Object.assign(output, response);
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  renderSuccess(`Conferencing app "${app}" disconnected.`);
}
