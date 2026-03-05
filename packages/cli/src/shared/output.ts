import chalk from "chalk";

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
