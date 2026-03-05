import chalk from "chalk";

export interface OutputOptions {
  json?: boolean;
}

export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function formatTimeRange(start: string | Date, end: string | Date): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatDateShort(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function renderError(message: string): void {
  console.error(chalk.red(`Error: ${message}`));
}

export function renderSuccess(message: string): void {
  console.log(chalk.green(message));
}

export function renderWarning(message: string): void {
  console.log(chalk.yellow(message));
}

export function renderTable(headers: string[], rows: string[][]): void {
  if (rows.length === 0) {
    console.log(chalk.dim("No results found."));
    return;
  }

  const colWidths = headers.map((h, i) => {
    const maxDataWidth = rows.reduce((max, row) => Math.max(max, (row[i] || "").length), 0);
    return Math.max(h.length, maxDataWidth);
  });

  const headerLine = headers.map((h, i) => chalk.bold(h.padEnd(colWidths[i]))).join("  ");
  const separator = colWidths.map((w) => "-".repeat(w)).join("  ");

  console.log(headerLine);
  console.log(chalk.dim(separator));

  for (const row of rows) {
    const line = row.map((cell, i) => (cell || "").padEnd(colWidths[i])).join("  ");
    console.log(line);
  }
}
