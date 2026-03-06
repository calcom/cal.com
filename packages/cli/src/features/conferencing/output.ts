import chalk from "chalk";
import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type { ConferencingApp, DefaultConferencingApp, DisconnectConferencingAppResponse } from "./types";

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
    apps.map((app) => [
      String(app.id),
      app.type,
      String(app.userId),
      app.invalid ? chalk.red("Yes") : chalk.green("No"),
    ])
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

  renderHeader("Default Conferencing App");
  renderDetail([
    ["App:", app.appSlug],
    ["Link:", app.appLink],
  ]);
}

export function renderConferencingAppDisconnected(
  app: string,
  response: DisconnectConferencingAppResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response ?? { status: "success" }, null, 2));
    return;
  }

  renderSuccess(`Conferencing app "${app}" disconnected.`);
}
