"use client";

import { useCallback, useState } from "react";

import { Badge } from "@calcom/ui/components/badge";
import {
  TableNew,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calcom/ui/components/table";
import { ClockIcon, DownloadIcon } from "@coss/ui/icons";

import {
  SqlResultsChart,
  ViewModeToggle,
  useChartAvailable,
  type ResultsViewMode,
} from "./SqlResultsChart";

// ─── Shared types ────────────────────────────────────────────────────────────

export type SchemaTable = {
  modelName: string;
  tableName: string;
  slug: string;
  columns: { column: string; label: string; type: string; enumValues?: string[] }[];
};

// ─── CSV export ──────────────────────────────────────────────────────────────

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Wrap in quotes if the value contains a comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(columns: string[], rows: Record<string, unknown>[]) {
  const header = columns.map(escapeCsvCell).join(",");
  const body = rows.map((row) => columns.map((col) => escapeCsvCell(row[col])).join(",")).join("\n");
  const csv = header + "\n" + body;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `query-results-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Results table ───────────────────────────────────────────────────────────

/** Heuristic: does this result set look like aggregated data worth charting? */
export function ResultsTable({
  columns,
  rows,
  rowCount,
  truncated,
  executionTimeMs,
  /** Hint from the query builder that aggregation is active */
  hasAggregation,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  executionTimeMs: number;
  hasAggregation?: boolean;
}) {
  const chartAvailable = useChartAvailable(columns, rows);
  const [viewMode, setViewMode] = useState<ResultsViewMode>(
    chartAvailable && hasAggregation ? "both" : "table"
  );

  const showChart = chartAvailable && (viewMode === "chart" || viewMode === "both");
  const showTable = viewMode === "table" || viewMode === "both";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Results header */}
      <div className="border-subtle bg-subtle/50 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="green" size="sm">
            {rowCount} row{rowCount !== 1 && "s"}
          </Badge>
          {truncated && (
            <Badge variant="orange" size="sm">
              Truncated (limit 1000)
            </Badge>
          )}
          <span className="text-muted flex items-center gap-1 text-[11px]">
            <ClockIcon className="h-3 w-3" />
            {executionTimeMs}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv(columns, rows)}
            className="text-subtle hover:text-default flex items-center gap-1 text-[11px] transition-colors">
            <DownloadIcon className="h-3 w-3" />
            CSV
          </button>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} chartAvailable={chartAvailable} />
        </div>
      </div>

      {/* Chart + summary stats */}
      {showChart && <SqlResultsChart columns={columns} rows={rows} />}

      {/* Scrollable table */}
      {showTable && (
        <div className="flex-1 overflow-auto">
          <TableNew className="border-0">
            <TableHeader className="bg-subtle sticky top-0 z-10">
              <TableRow className="hover:bg-subtle border-0">
                <TableHead className="border-subtle text-muted w-10 border-r text-right font-mono text-[10px]">
                  #
                </TableHead>
                {columns.map((col) => (
                  <TableHead key={col} className="border-subtle border-r text-xs">
                    <span className="text-default">{col}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} className="border-0">
                  <TableCell className="border-subtle text-muted w-10 border-r text-right font-mono text-[10px]">
                    {idx + 1}
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      className="border-subtle max-w-[300px] truncate border-r px-2 py-1 font-mono text-xs"
                      title={String(row[col] ?? "")}>
                      <CellValue value={row[col]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </TableNew>
        </div>
      )}
    </div>
  );
}

export function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "green" : "gray"} size="sm">
        {String(value)}
      </Badge>
    );
  }
  if (value instanceof Date) {
    return <span>{value.toISOString()}</span>;
  }
  if (typeof value === "object") {
    return <span className="text-muted">{JSON.stringify(value)}</span>;
  }
  return <span>{String(value)}</span>;
}
