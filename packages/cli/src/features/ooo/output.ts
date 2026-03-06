import {
  formatDate,
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type { OooEntry } from "./types";

function formatOooRow(entry: OooEntry): string[] {
  return [
    String(entry.id),
    formatDate(entry.start),
    formatDate(entry.end),
    entry.reason || "unspecified",
    entry.notes || "",
  ];
}

function renderOooDetail(entry: OooEntry): void {
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

export function renderOooList(entries: OooEntry[] | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (!entries?.length) {
    console.log("No out-of-office entries found.");
    return;
  }

  renderTable(["ID", "Start", "End", "Reason", "Notes"], entries.map(formatOooRow));
}

export function renderOoo(entry: OooEntry | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  if (!entry) {
    console.log("Out-of-office entry not found.");
    return;
  }

  renderOooDetail(entry);
}

export function renderOooCreated(entry: OooEntry | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  if (!entry) {
    console.log("Failed to create out-of-office entry.");
    return;
  }

  renderSuccess(`Out-of-office entry created (ID: ${entry.id}).`);
  renderOooDetail(entry);
}

export function renderOooUpdated(entry: OooEntry | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  if (!entry) {
    console.log("Failed to update out-of-office entry.");
    return;
  }

  renderSuccess(`Out-of-office entry ${entry.id} updated.`);
  renderOooDetail(entry);
}

export function renderOooDeleted(oooId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Out-of-office entry ${oooId} deleted` }));
    return;
  }

  renderSuccess(`Out-of-office entry ${oooId} deleted.`);
}
