"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";

// ─── Color palette ───────────────────────────────────────────────────────────

const COLORS = [
  "#0a0a0a", // black
  "#a3a3a3", // gray-400
  "#525252", // gray-600
  "#d4d4d4", // gray-300
  "#262626", // gray-800
  "#737373", // gray-500
  "#e5e5e5", // gray-200
  "#404040", // gray-700
  "#171717", // gray-900
  "#fafafa", // gray-50
];

// ─── Data analysis ───────────────────────────────────────────────────────────

interface ColumnAnalysis {
  name: string;
  kind: "numeric" | "text" | "date" | "boolean" | "other";
  uniqueCount: number;
}

type ChartType = "bar" | "line" | "pie" | "none";

interface ChartSuggestion {
  type: ChartType;
  labelColumn: string;
  valueColumns: string[];
  reason: string;
}

function analyzeColumns(
  columns: string[],
  rows: Record<string, unknown>[]
): ColumnAnalysis[] {
  return columns.map((name) => {
    const values = rows.map((r) => r[name]).filter((v) => v != null);
    const uniqueCount = new Set(values.map(String)).size;

    // Detect type from values
    if (values.length === 0) return { name, kind: "other", uniqueCount: 0 };

    const sample = values.slice(0, 20);
    const allNumbers = sample.every(
      (v) => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "")
    );
    if (allNumbers) return { name, kind: "numeric", uniqueCount };

    const allBooleans = sample.every((v) => typeof v === "boolean" || v === "true" || v === "false");
    if (allBooleans) return { name, kind: "boolean", uniqueCount };

    // Check for dates — handles Date objects, ISO strings, and date-like strings
    const allDates = sample.every((v) => {
      if (v instanceof Date) return true;
      if (typeof v !== "string") return false;
      // ISO 8601: "2026-03-01T00:00:00.000Z" or "2026-03-01"
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
        return !isNaN(new Date(v).getTime());
      }
      return false;
    });
    if (allDates) return { name, kind: "date", uniqueCount };

    // Also detect by column name hint (common date patterns from SQL)
    const lowerName = name.toLowerCase();
    const dateNameHints = ["date", "day", "month", "week", "year", "time", "created", "updated", "_at"];
    const looksLikeDateName = dateNameHints.some((h) => lowerName.includes(h));
    if (looksLikeDateName && sample.length > 0) {
      // Try parsing first value — if it's a valid date, treat column as date
      const first = sample[0];
      const asStr = typeof first === "string" ? first : first instanceof Date ? first.toISOString() : "";
      if (asStr && !isNaN(new Date(asStr).getTime()) && asStr.length > 6) {
        return { name, kind: "date", uniqueCount };
      }
    }

    return { name, kind: "text", uniqueCount };
  });
}

function suggestChart(
  analysis: ColumnAnalysis[],
  rowCount: number
): ChartSuggestion {
  const numericCols = analysis.filter((c) => c.kind === "numeric");
  const labelCols = analysis.filter(
    (c) => c.kind === "text" || c.kind === "date"
  );

  // No numeric columns → can't chart
  if (numericCols.length === 0) {
    return { type: "none", labelColumn: "", valueColumns: [], reason: "No numeric columns to visualize" };
  }

  // Single label column + 1+ numeric columns
  if (labelCols.length >= 1 && numericCols.length >= 1) {
    const label = labelCols[0];
    const values = numericCols.slice(0, 5).map((c) => c.name);

    // Pie chart: single numeric column + few categories
    if (numericCols.length === 1 && label.uniqueCount <= 12 && label.kind === "text") {
      return {
        type: "pie",
        labelColumn: label.name,
        valueColumns: values,
        reason: `${label.uniqueCount} categories × 1 metric`,
      };
    }

    // Date axis → line chart
    if (label.kind === "date") {
      return {
        type: "line",
        labelColumn: label.name,
        valueColumns: values,
        reason: `Time series with ${numericCols.length} metric${numericCols.length > 1 ? "s" : ""}`,
      };
    }

    // Bar chart for categorical data
    return {
      type: rowCount <= 50 ? "bar" : "bar",
      labelColumn: label.name,
      valueColumns: values,
      reason: `${label.uniqueCount} categories × ${numericCols.length} metric${numericCols.length > 1 ? "s" : ""}`,
    };
  }

  // Only numeric columns → bar chart with row index as label
  if (numericCols.length >= 1) {
    return {
      type: "bar",
      labelColumn: numericCols[0].name,
      valueColumns: numericCols.slice(1, 5).map((c) => c.name),
      reason: `${numericCols.length} numeric columns`,
    };
  }

  return { type: "none", labelColumn: "", valueColumns: [], reason: "Cannot determine chart type" };
}

// ─── Summary stats ───────────────────────────────────────────────────────────

interface NumericStat {
  column: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

function computeStats(
  columns: string[],
  rows: Record<string, unknown>[],
  analysis: ColumnAnalysis[]
): NumericStat[] {
  return analysis
    .filter((c) => c.kind === "numeric")
    .map((col) => {
      const values = rows
        .map((r) => {
          const v = r[col.name];
          return typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
        })
        .filter((v) => !isNaN(v));

      if (values.length === 0) {
        return { column: col.name, count: 0, sum: 0, avg: 0, min: 0, max: 0 };
      }

      const sum = values.reduce((a, b) => a + b, 0);
      return {
        column: col.name,
        count: values.length,
        sum,
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });
}

function SummaryStats({
  stats,
  enabledMetrics,
  onToggle,
  colorIndexMap,
  hasChart,
}: {
  stats: NumericStat[];
  enabledMetrics?: Set<string>;
  onToggle?: (metric: string) => void;
  colorIndexMap?: Map<string, number>;
  hasChart?: boolean;
}) {
  if (stats.length === 0) return null;

  const isToggleable = hasChart && enabledMetrics && onToggle && stats.length > 1;

  return (
    <div className="border-subtle flex flex-wrap gap-3 border-b px-3 py-2">
      {stats.map((s) => {
        const colorIdx = colorIndexMap?.get(s.column) ?? 0;
        const color = COLORS[colorIdx % COLORS.length];
        const isEnabled = !enabledMetrics || enabledMetrics.has(s.column);

        return (
          <button
            key={s.column}
            type="button"
            onClick={() => isToggleable && onToggle(s.column)}
            className={classNames(
              "flex flex-col gap-0.5 rounded-md px-3 py-1.5 text-left transition-all",
              isToggleable ? "cursor-pointer" : "cursor-default",
              isEnabled
                ? "bg-subtle hover:bg-emphasis/10"
                : "bg-muted/40 opacity-50 hover:opacity-70"
            )}>
            <span className="flex items-center gap-1.5">
              {isToggleable && (
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: color, opacity: isEnabled ? 1 : 0.3 }}
                />
              )}
              <span
                className={classNames(
                  "text-[11px] font-semibold",
                  isEnabled ? "text-emphasis" : "text-muted line-through"
                )}>
                {s.column}
              </span>
            </span>
            <div className="flex gap-3 text-[10px]">
              <span className="text-muted">
                sum <span className="text-default font-medium">{formatNum(s.sum)}</span>
              </span>
              <span className="text-muted">
                avg <span className="text-default font-medium">{formatNum(s.avg)}</span>
              </span>
              <span className="text-muted">
                min <span className="text-default font-medium">{formatNum(s.min)}</span>
              </span>
              <span className="text-muted">
                max <span className="text-default font-medium">{formatNum(s.max)}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatNum(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e6) return n.toLocaleString();
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toFixed(2);
}

// ─── Chart components ────────────────────────────────────────────────────────

function BarChartView({
  data,
  labelColumn,
  valueColumns,
  colorIndexMap,
}: {
  data: Record<string, unknown>[];
  labelColumn: string;
  valueColumns: string[];
  colorIndexMap?: Map<string, number>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
        <XAxis
          dataKey={labelColumn}
          className="text-[10px]"
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          tick={{ fill: "currentColor", opacity: 0.6 }}
        />
        <YAxis
          className="text-[10px]"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "currentColor", opacity: 0.6 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--cal-bg-default, #fff)",
            border: "1px solid var(--cal-border-subtle, #e5e7eb)",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        {valueColumns.map((col, i) => (
          <Bar
            key={col}
            dataKey={col}
            fill={COLORS[(colorIndexMap?.get(col) ?? i) % COLORS.length]}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({
  data,
  labelColumn,
  valueColumns,
  colorIndexMap,
}: {
  data: Record<string, unknown>[];
  labelColumn: string;
  valueColumns: string[];
  colorIndexMap?: Map<string, number>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
        <XAxis
          dataKey={labelColumn}
          className="text-[10px]"
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          tick={{ fill: "currentColor", opacity: 0.6 }}
        />
        <YAxis
          className="text-[10px]"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "currentColor", opacity: 0.6 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--cal-bg-default, #fff)",
            border: "1px solid var(--cal-border-subtle, #e5e7eb)",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        {valueColumns.map((col, i) => (
          <Line
            key={col}
            type="monotone"
            dataKey={col}
            stroke={COLORS[(colorIndexMap?.get(col) ?? i) % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartView({
  data,
  labelColumn,
  valueColumn,
}: {
  data: Record<string, unknown>[];
  labelColumn: string;
  valueColumn: string;
}) {
  const chartData = data.map((row) => ({
    name: String(row[labelColumn] ?? ""),
    value: Number(row[valueColumn]) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="70%"
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          labelLine={{ strokeWidth: 1 }}
          style={{ fontSize: 11 }}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--cal-bg-default, #fff)",
            border: "1px solid var(--cal-border-subtle, #e5e7eb)",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── View mode toggle ────────────────────────────────────────────────────────

export type ResultsViewMode = "table" | "chart" | "both";

export function ViewModeToggle({
  mode,
  onChange,
  chartAvailable,
}: {
  mode: ResultsViewMode;
  onChange: (mode: ResultsViewMode) => void;
  chartAvailable: boolean;
}) {
  if (!chartAvailable) return null;

  return (
    <div className="flex overflow-hidden rounded border">
      {(["table", "chart", "both"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={classNames(
            "px-2 py-0.5 text-[10px] font-medium capitalize transition-colors",
            mode === m ? "bg-emphasis text-inverted" : "bg-default text-subtle hover:bg-subtle"
          )}>
          {m}
        </button>
      ))}
    </div>
  );
}

// ─── Main chart panel ────────────────────────────────────────────────────────

export function SqlResultsChart({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  const analysis = useMemo(() => analyzeColumns(columns, rows), [columns, rows]);
  const suggestion = useMemo(() => suggestChart(analysis, rows.length), [analysis, rows.length]);
  const stats = useMemo(() => computeStats(columns, rows, analysis), [columns, rows, analysis]);

  // Track which metrics are enabled — default all on; reset when suggestion changes
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string>>(
    () => new Set(suggestion.valueColumns)
  );
  const prevColumnsRef = useRef(suggestion.valueColumns);

  useEffect(() => {
    const prev = prevColumnsRef.current;
    const next = suggestion.valueColumns;
    if (prev.length !== next.length || prev.some((c, i) => c !== next[i])) {
      setEnabledMetrics(new Set(next));
      prevColumnsRef.current = next;
    }
  }, [suggestion.valueColumns]);

  const handleToggle = useCallback(
    (metric: string) => {
      setEnabledMetrics((prev) => {
        const next = new Set(prev);
        if (next.has(metric)) {
          // Don't allow disabling the last metric
          if (next.size <= 1) return prev;
          next.delete(metric);
        } else {
          next.add(metric);
        }
        return next;
      });
    },
    []
  );

  const activeValueColumns = useMemo(
    () => suggestion.valueColumns.filter((c) => enabledMetrics.has(c)),
    [suggestion.valueColumns, enabledMetrics]
  );

  // Stable color mapping: each metric keeps its original index-based color
  const colorIndexMap = useMemo(
    () => new Map(suggestion.valueColumns.map((col, i) => [col, i])),
    [suggestion.valueColumns]
  );

  // Coerce values for recharts: numbers from strings, dates to readable labels
  const chartData = useMemo(() => {
    const numericColSet = new Set(analysis.filter((c) => c.kind === "numeric").map((c) => c.name));
    const dateColSet = new Set(analysis.filter((c) => c.kind === "date").map((c) => c.name));
    return rows.map((row) => {
      const coerced: Record<string, unknown> = { ...row };
      for (const col of Array.from(numericColSet)) {
        const v = coerced[col];
        if (typeof v === "string") coerced[col] = Number(v);
      }
      for (const col of Array.from(dateColSet)) {
        const v = coerced[col];
        if (v != null) {
          const d = v instanceof Date ? v : new Date(String(v));
          if (!isNaN(d.getTime())) {
            // Short readable label: "Mar 1" or "Mar 1, 2026" if multi-year
            coerced[col] = d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              ...(rows.length > 1 ? {} : { year: "numeric" }),
            });
          }
        }
      }
      return coerced;
    });
  }, [rows, analysis]);

  if (suggestion.type === "none" && stats.length === 0) return null;

  return (
    <div className="flex flex-col">
      {/* Summary stats — also serves as metric toggle when chart is visible */}
      <SummaryStats
        stats={stats}
        enabledMetrics={enabledMetrics}
        onToggle={handleToggle}
        colorIndexMap={colorIndexMap}
        hasChart={suggestion.type !== "none"}
      />

      {/* Chart */}
      {suggestion.type !== "none" && activeValueColumns.length > 0 && (
        <div className="border-subtle border-b px-3 py-2">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="gray" size="sm" className="capitalize">
              {suggestion.type}
            </Badge>
            <span className="text-muted text-[10px]">{suggestion.reason}</span>
          </div>
          <div style={{ height: 240 }}>
            {suggestion.type === "bar" && (
              <BarChartView
                data={chartData}
                labelColumn={suggestion.labelColumn}
                valueColumns={activeValueColumns}
                colorIndexMap={colorIndexMap}
              />
            )}
            {suggestion.type === "line" && (
              <LineChartView
                data={chartData}
                labelColumn={suggestion.labelColumn}
                valueColumns={activeValueColumns}
                colorIndexMap={colorIndexMap}
              />
            )}
            {suggestion.type === "pie" && (
              <PieChartView
                data={chartData}
                labelColumn={suggestion.labelColumn}
                valueColumn={activeValueColumns[0]}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Returns whether chart visualization is available for the given data */
export function useChartAvailable(columns: string[], rows: Record<string, unknown>[]): boolean {
  return useMemo(() => {
    if (rows.length === 0) return false;
    const analysis = analyzeColumns(columns, rows);
    const suggestion = suggestChart(analysis, rows.length);
    return suggestion.type !== "none" || analysis.some((c) => c.kind === "numeric");
  }, [columns, rows]);
}
