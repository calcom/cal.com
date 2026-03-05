import chalk from "chalk";
import { formatDate, renderSuccess, renderTable, type OutputOptions } from "../../shared/output";
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
  console.log(chalk.bold("\nOut-of-Office Entry"));
  console.log(`  ID:       ${entry.id}`);
  console.log(`  Start:    ${formatDate(entry.start)}`);
  console.log(`  End:      ${formatDate(entry.end)}`);
  console.log(`  Reason:   ${entry.reason || "unspecified"}`);
  if (entry.notes) {
    console.log(`  Notes:    ${entry.notes}`);
  }
  if (entry.toUserId) {
    console.log(`  Cover:    User #${entry.toUserId}`);
  }
  console.log();
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
