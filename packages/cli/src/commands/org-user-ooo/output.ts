import {
  formatDate,
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type { OrgUserOooEntry } from "./types";

function formatOooRow(entry: OrgUserOooEntry): string[] {
  return [
    String(entry.id),
    formatDate(entry.start),
    formatDate(entry.end),
    entry.reason || "unspecified",
    entry.notes || "",
  ];
}

function renderOooDetail(entry: OrgUserOooEntry): void {
  renderHeader("Out-of-Office Entry");
  renderDetail([
    ["ID:", entry.id],
    ["Start:", formatDate(entry.start)],
    ["End:", formatDate(entry.end)],
    ["Reason:", entry.reason || "unspecified"],
    ["Notes:", entry.notes],
    ["Cover:", entry.toUserId ? `User #${entry.toUserId}` : undefined],
  ]);
}

export function renderOrgUserOooList(
  entries: OrgUserOooEntry[] | undefined,
  userId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (!entries?.length) {
    console.log(`No out-of-office entries found for user ${userId}.`);
    return;
  }

  console.log(`Out-of-office entries for user ${userId}:\n`);
  renderTable(["ID", "Start", "End", "Reason", "Notes"], entries.map(formatOooRow));
}

export function renderOrgUserOooCreated(
  entry: OrgUserOooEntry | undefined,
  userId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  if (!entry) {
    console.log(`Failed to create out-of-office entry for user ${userId}.`);
    return;
  }

  renderSuccess(`Out-of-office entry created for user ${userId} (ID: ${entry.id}).`);
  renderOooDetail(entry);
}

export function renderOrgUserOooUpdated(
  entry: OrgUserOooEntry | undefined,
  userId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  if (!entry) {
    console.log(`Failed to update out-of-office entry for user ${userId}.`);
    return;
  }

  renderSuccess(`Out-of-office entry ${entry.id} updated for user ${userId}.`);
  renderOooDetail(entry);
}

export function renderOrgUserOooDeleted(oooId: string, userId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(
      JSON.stringify({
        status: "success",
        message: `Out-of-office entry ${oooId} deleted for user ${userId}`,
      })
    );
    return;
  }

  renderSuccess(`Out-of-office entry ${oooId} deleted for user ${userId}.`);
}
