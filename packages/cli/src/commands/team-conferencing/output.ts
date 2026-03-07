import chalk from "chalk";
import { type OutputOptions, renderHeader, renderSuccess, renderTable } from "../../shared/output";
import type {
  TeamConferencingApp,
  TeamDisconnectConferencingAppResponse,
  TeamOAuthUrlResponse,
  TeamSetDefaultConferencingAppResponse,
} from "./types";

export function renderTeamConferencingAppList(
  apps: TeamConferencingApp[] | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(apps, null, 2));
    return;
  }

  if (!apps || apps.length === 0) {
    console.log("No conferencing apps connected for this team.");
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

export function renderTeamDefaultConferencingAppSet(
  app: string,
  response: TeamSetDefaultConferencingAppResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response ?? { status: "success" }, null, 2));
    return;
  }

  renderSuccess(`Default conferencing app set to "${app}" for the team.`);
}

export function renderTeamConferencingAppConnected(app: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", app }, null, 2));
    return;
  }

  renderSuccess(`Conferencing app "${app}" connected for the team.`);
}

export function renderTeamConferencingAppDisconnected(
  app: string,
  response: TeamDisconnectConferencingAppResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response ?? { status: "success" }, null, 2));
    return;
  }

  renderSuccess(`Conferencing app "${app}" disconnected for the team.`);
}

export function renderTeamConferencingOAuthUrl(
  app: string,
  response: TeamOAuthUrlResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response ?? { status: "success" }, null, 2));
    return;
  }

  renderHeader(`OAuth URL for ${app}`);
  renderSuccess(`OAuth URL request submitted for "${app}".`);
  console.log("Follow the authentication flow in your browser to complete the connection.");
}
