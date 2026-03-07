import chalk from "chalk";
import { type OutputOptions, renderDetail, renderHeader, renderSuccess } from "../../shared/output";
import type { DelegationCredential } from "./types";

function formatEnabled(enabled: boolean): string {
  return enabled ? chalk.green("Yes") : chalk.red("No");
}

function renderDelegationCredentialDetail(credential: DelegationCredential): void {
  renderHeader(`Delegation Credential #${credential.id}`);
  renderDetail([
    ["Domain:", credential.domain],
    ["Enabled:", formatEnabled(credential.enabled)],
    ["Organization ID:", String(credential.organizationId)],
    ["Platform:", `${credential.workspacePlatform.name} (${credential.workspacePlatform.slug})`],
    ["Created:", credential.createdAt],
    ["Updated:", credential.updatedAt],
  ]);
}

export function renderDelegationCredentialCreated(
  data: DelegationCredential | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create delegation credential.");
    return;
  }

  renderSuccess(`Delegation credential created (ID: ${data.id})`);
  renderDelegationCredentialDetail(data);
}

export function renderDelegationCredentialUpdated(
  data: DelegationCredential | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update delegation credential.");
    return;
  }

  renderSuccess(`Delegation credential updated (ID: ${data.id})`);
  renderDelegationCredentialDetail(data);
}
