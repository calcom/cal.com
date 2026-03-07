import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type { ManagedOrgCreateResponse, ManagedOrgList, ManagedOrgResponse } from "./types";

function renderManagedOrgDetail(org: ManagedOrgResponse): void {
  renderHeader(`Managed Organization: ${org.name}`);
  renderDetail([
    ["ID:", org.id],
    ["Name:", org.name],
    ["Slug:", org.slug],
    ["Metadata:", org.metadata ? JSON.stringify(org.metadata) : undefined],
  ]);
}

export function renderManagedOrg(data: ManagedOrgResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Managed organization not found.");
    return;
  }

  renderManagedOrgDetail(data);
}

export function renderManagedOrgList(orgs: ManagedOrgList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(orgs, null, 2));
    return;
  }

  if (!orgs?.length) {
    console.log("No managed organizations found.");
    return;
  }

  renderTable(
    ["ID", "Name", "Slug"],
    orgs.map((o) => [String(o.id), o.name, o.slug || ""])
  );
}

export function renderManagedOrgCreated(
  data: ManagedOrgCreateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create managed organization.");
    return;
  }

  renderSuccess(`Managed organization created: ${data.name} (ID: ${data.id})`);
  renderDetail([
    ["ID:", data.id],
    ["Name:", data.name],
    ["Slug:", data.slug],
    ["API Key:", data.apiKey],
    ["Metadata:", data.metadata ? JSON.stringify(data.metadata) : undefined],
  ]);
}

export function renderManagedOrgUpdated(
  data: ManagedOrgResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update managed organization.");
    return;
  }

  renderSuccess(`Managed organization updated: ${data.name} (ID: ${data.id})`);
}

export function renderManagedOrgDeleted(managedOrgId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(
      JSON.stringify({ status: "success", message: `Managed organization ${managedOrgId} deleted` })
    );
    return;
  }

  renderSuccess(`Managed organization ${managedOrgId} deleted.`);
}
