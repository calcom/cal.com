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

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, "");
}

function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

function padEndVisible(str: string, targetLength: number): string {
  const visible = visibleLength(str);
  if (visible >= targetLength) return str;
  return str + " ".repeat(targetLength - visible);
}

export function renderTable(headers: string[], rows: string[][]): void {
  if (rows.length === 0) {
    console.log(chalk.dim("No results found."));
    return;
  }

  const colWidths = headers.map((h, i) => {
    const maxDataWidth = rows.reduce((max, row) => Math.max(max, visibleLength(row[i] || "")), 0);
    return Math.max(h.length, maxDataWidth);
  });

  const headerLine = headers.map((h, i) => chalk.bold(h.padEnd(colWidths[i]))).join("  ");
  const separator = colWidths.map((w) => "-".repeat(w)).join("  ");

  console.log(headerLine);
  console.log(chalk.dim(separator));

  for (const row of rows) {
    const line = row.map((cell, i) => padEndVisible(cell || "", colWidths[i])).join("  ");
    console.log(line);
  }
}

/**
 * Renders a section header with the title in bold
 */
export function renderHeader(title: string): void {
  console.log(chalk.bold(`\n${title}`));
}

export type DetailField = [label: string, value: string | number | boolean | null | undefined];

/**
 * Renders a list of key-value pairs in aligned columns
 * @param fields Array of [label, value] tuples
 * @param indent Number of spaces to indent (default: 2)
 */
export function renderDetail(fields: DetailField[], indent = 2): void {
  const maxLabelWidth = Math.max(...fields.map(([label]) => label.length));
  const padding = " ".repeat(indent);

  for (const [label, value] of fields) {
    if (value === undefined || value === null) continue;
    const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
    console.log(`${padding}${label.padEnd(maxLabelWidth)}  ${displayValue}`);
  }
  console.log();
}
