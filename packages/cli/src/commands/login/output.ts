import { type OutputOptions, renderSuccess } from "../../shared/output";

export function renderLogoutSuccess({ json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: "Logged out" }));
    return;
  }
  renderSuccess("Logged out. Credentials removed from ~/.calcom/config.json");
}

export function renderLoginSuccess(method: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", method }));
    return;
  }
  renderSuccess(`Authenticated via ${method}.`);
}
