"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "@calcom/ui/classNames";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { Badge } from "@calcom/ui/components/badge";

import {
  PlusIcon,
  XIcon,
  PlayIcon,
  CopyIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LinkIcon,
  CodeIcon,
} from "@coss/ui/icons";

// ─── Types ───────────────────────────────────────────────────────────────────

type SchemaTable = {
  modelName: string;
  tableName: string;
  slug: string;
  columns: SchemaColumn[];
};

type SchemaColumn = {
  column: string;
  label: string;
  type: string;
  enumValues?: string[];
};

type SqlMutationResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  executionTimeMs: number;
};

type AggFn = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";

interface FilterRow {
  id: string;
  column: string;
  operator: string;
  value: string;
}

interface JoinRow {
  id: string;
  joinType: "LEFT JOIN" | "INNER JOIN";
  table: string;
  fromCol: string;
  toCol: string;
  columns: string[];
}

interface SortRow {
  id: string;
  column: string;
  direction: "ASC" | "DESC";
}

interface MetricRow {
  id: string;
  fn: AggFn;
  column: string;
  alias: string;
}

interface SqlQueryBuilderProps {
  schema: SchemaTable[];
  onExecute: (sql: string) => void;
  sqlMutation: {
    isPending: boolean;
    data?: SqlMutationResult;
    error?: { message: string } | null;
  };
  onSqlChange?: (sql: string) => void;
  onAggregationChange?: (hasAggregation: boolean) => void;
  onOpenInEditor?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `_${++_id}`;
const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;
const isUnary = (op: string) => op === "IS NULL" || op === "IS NOT NULL";

function detectRelationships(table: SchemaTable, schema: SchemaTable[]) {
  const rels: { fkCol: string; target: SchemaTable; targetCol: string; direction: "out" | "in" }[] = [];

  for (const col of table.columns) {
    if (col.column === "id") continue;
    let name = "";
    if (col.column.endsWith("Id")) name = col.column.slice(0, -2);
    else if (col.column.endsWith("_id")) name = col.column.slice(0, -3);
    if (!name) continue;

    const target = schema.find(
      (t) =>
        t.tableName !== table.tableName &&
        (t.modelName.toLowerCase() === name.toLowerCase() ||
          t.tableName.toLowerCase() === name.toLowerCase() ||
          t.tableName.toLowerCase() === name.toLowerCase() + "s")
    );
    if (target) rels.push({ fkCol: col.column, target, targetCol: "id", direction: "out" });
  }

  for (const other of schema) {
    if (other.tableName === table.tableName) continue;
    for (const col of other.columns) {
      let name = "";
      if (col.column.endsWith("Id")) name = col.column.slice(0, -2);
      else if (col.column.endsWith("_id")) name = col.column.slice(0, -3);
      if (!name) continue;
      if (
        table.modelName.toLowerCase() === name.toLowerCase() ||
        table.tableName.toLowerCase() === name.toLowerCase() ||
        table.tableName.toLowerCase() === name.toLowerCase() + "s"
      ) {
        if (!rels.some((r) => r.target.tableName === other.tableName))
          rels.push({ fkCol: "id", target: other, targetCol: col.column, direction: "in" });
      }
    }
  }
  return rels;
}

function getOperators(col: SchemaColumn) {
  const lo = col.type.toLowerCase();
  const base: [string, string][] = [
    ["=", "is"],
    ["!=", "is not"],
    ["IS NULL", "is empty"],
    ["IS NOT NULL", "has a value"],
  ];

  if (lo.includes("int") || lo.includes("float") || lo.includes("decimal") || lo.includes("numeric") || lo.includes("serial"))
    return [...base, [">", "greater than"], [">=", "at least"], ["<", "less than"], ["<=", "at most"]] as [string, string][];

  if (lo.includes("timestamp") || lo.includes("date") || lo.includes("time"))
    return [...base, [">", "after"], ["<", "before"], [">=", "on or after"], ["<=", "on or before"]] as [string, string][];

  if (lo.includes("bool"))
    return [["=", "is"], ["IS NULL", "is empty"], ["IS NOT NULL", "has a value"]] as [string, string][];

  if (col.enumValues?.length)
    return [...base, ["IN", "is any of"]] as [string, string][];

  return [...base, ["ILIKE", "contains"], ["NOT ILIKE", "doesn't contain"], ["LIKE", "matches pattern"]] as [string, string][];
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

function InlineSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={classNames(
        "border-subtle bg-default text-default h-7 rounded border px-2 text-xs outline-none focus:border-blue-500",
        className
      )}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SectionHeader({
  title,
  count,
  actions,
}: {
  title: string;
  count?: number;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-emphasis text-xs font-semibold">{title}</span>
        {count != null && count > 0 && (
          <Badge variant="gray" size="sm">
            {count}
          </Badge>
        )}
      </div>
      {actions}
    </div>
  );
}

/** Pill for displaying a configured value — matches the FilterPill from StudioTable */
function ConfigPill({
  children,
  onRemove,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <Badge
      variant={active ? "blue" : "gray"}
      size="sm"
      className={classNames(
        "gap-1 pl-2",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}>
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-blue-600/20 -mr-0.5 rounded p-0.5 transition-colors">
          <XIcon className="h-2.5 w-2.5" />
        </button>
      )}
    </Badge>
  );
}

// ─── Step 1: Pick Data ───────────────────────────────────────────────────────

function PickDataStep({
  schema,
  selectedTable,
  onSelect,
  selectedColumns,
  onColumnsChange,
}: {
  schema: SchemaTable[];
  selectedTable: SchemaTable | undefined;
  onSelect: (tableName: string) => void;
  selectedColumns: string[];
  onColumnsChange: (cols: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [showColumns, setShowColumns] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return schema;
    const q = search.toLowerCase();
    return schema.filter(
      (t) => t.modelName.toLowerCase().includes(q) || t.tableName.toLowerCase().includes(q)
    );
  }, [schema, search]);

  if (!selectedTable) {
    return (
      <div className="border-subtle border-b px-3 py-3">
        <div className="text-emphasis mb-2 text-xs font-semibold">Pick your data</div>
        <input
          type="text"
          placeholder="Search tables…"
          className="border-subtle bg-default text-default placeholder:text-muted mb-2 h-7 w-full rounded border px-2 text-xs outline-none focus:border-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="grid max-h-60 grid-cols-3 gap-1 overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.tableName}
              onClick={() => onSelect(t.tableName)}
              className="border-subtle hover:bg-subtle flex flex-col items-start rounded border px-2.5 py-1.5 text-left transition-colors">
              <span className="text-emphasis text-xs font-medium">{t.modelName}</span>
              <span className="text-muted text-[10px]">{t.columns.length} cols</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-muted col-span-3 py-4 text-center text-xs">No tables found</div>
          )}
        </div>
      </div>
    );
  }

  const allCols = selectedColumns.length === 0;
  const colLabel = allCols ? "All columns" : `${selectedColumns.length} columns`;

  return (
    <div className="border-subtle border-b">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-emphasis text-xs font-semibold">{selectedTable.modelName}</span>
          <button
            onClick={() => setShowColumns(!showColumns)}
            className="text-subtle hover:text-default text-[11px]">
            {colLabel} {showColumns ? "▾" : "›"}
          </button>
        </div>
        <button onClick={() => onSelect("")} className="text-subtle hover:text-default text-[10px]">
          Change
        </button>
      </div>

      {showColumns && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          <button
            onClick={() => onColumnsChange([])}
            className={classNames(
              "rounded border px-2 py-0.5 text-[11px] font-medium transition-colors",
              allCols
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                : "border-subtle text-muted hover:text-default"
            )}>
            All (*)
          </button>
          {selectedTable.columns.map((col) => {
            const active = !allCols && selectedColumns.includes(col.column);
            return (
              <button
                key={col.column}
                onClick={() => {
                  if (allCols) {
                    onColumnsChange(selectedTable.columns.map((c) => c.column).filter((c) => c !== col.column));
                  } else if (active) {
                    const next = selectedColumns.filter((c) => c !== col.column);
                    onColumnsChange(next.length === 0 ? [] : next);
                  } else {
                    onColumnsChange([...selectedColumns, col.column]);
                  }
                }}
                title={`${col.label} (${col.type})`}
                className={classNames(
                  "rounded border px-2 py-0.5 text-[11px] transition-colors",
                  active
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                    : "border-subtle text-muted hover:text-default"
                )}>
                {col.column}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Join ────────────────────────────────────────────────────────────

function JoinStep({
  joins,
  onChange,
  primaryTable,
  schema,
}: {
  joins: JoinRow[];
  onChange: (j: JoinRow[]) => void;
  primaryTable: SchemaTable;
  schema: SchemaTable[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const relationships = useMemo(() => detectRelationships(primaryTable, schema), [primaryTable, schema]);
  const addedTables = new Set(joins.map((j) => j.table));

  const addRelation = (rel: ReturnType<typeof detectRelationships>[0]) => {
    const j: JoinRow = {
      id: uid(),
      joinType: "LEFT JOIN",
      table: rel.target.tableName,
      fromCol: rel.fkCol,
      toCol: rel.targetCol,
      columns: rel.target.columns.slice(0, 3).map((c) => c.column),
    };
    onChange([...joins, j]);
    setExpanded(j.id);
  };

  const removeJoin = (id: string) => {
    onChange(joins.filter((j) => j.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const updateJoin = (id: string, updates: Partial<JoinRow>) =>
    onChange(joins.map((j) => (j.id === id ? { ...j, ...updates } : j)));

  const availableRels = relationships.filter((r) => !addedTables.has(r.target.tableName));

  if (relationships.length === 0 && joins.length === 0) return null;

  return (
    <div className="border-subtle border-b">
      <SectionHeader title="Join" count={joins.length || undefined} />

      {/* Active joins */}
      {joins.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {joins.map((j) => {
            const target = schema.find((t) => t.tableName === j.table);
            return (
              <ConfigPill
                key={j.id}
                onClick={() => setExpanded(expanded === j.id ? null : j.id)}
                onRemove={() => removeJoin(j.id)}
                active={expanded === j.id}>
                <LinkIcon className="h-2.5 w-2.5" />
                {target?.modelName ?? j.table}
                <span className="opacity-50">{j.columns.length} cols</span>
              </ConfigPill>
            );
          })}
        </div>
      )}

      {/* Expanded join editor */}
      {expanded &&
        (() => {
          const j = joins.find((j) => j.id === expanded);
          if (!j) return null;
          const target = schema.find((t) => t.tableName === j.table);
          return (
            <div className="border-subtle mx-3 mb-2 rounded-md border px-3 py-2">
              <div className="mb-1.5 flex items-center gap-2">
                <InlineSelect
                  value={j.joinType}
                  onChange={(v) => updateJoin(j.id, { joinType: v as "LEFT JOIN" | "INNER JOIN" })}
                  options={[
                    { value: "LEFT JOIN", label: "Include all " + primaryTable.modelName + " rows" },
                    { value: "INNER JOIN", label: "Only matching rows" },
                  ]}
                />
              </div>
              <div className="text-muted mb-2 font-mono text-[10px]">
                {primaryTable.modelName}.{j.fromCol} = {target?.modelName ?? j.table}.{j.toCol}
              </div>
              {target && (
                <div>
                  <span className="text-muted mb-1 block text-[10px]">Include columns:</span>
                  <div className="flex flex-wrap gap-1">
                    {target.columns.map((col) => {
                      const on = j.columns.includes(col.column);
                      return (
                        <button
                          key={col.column}
                          onClick={() =>
                            updateJoin(j.id, {
                              columns: on
                                ? j.columns.filter((c) => c !== col.column)
                                : [...j.columns, col.column],
                            })
                          }
                          className={classNames(
                            "rounded border px-1.5 py-0 text-[10px] transition-colors",
                            on
                              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                              : "border-subtle text-muted hover:text-default"
                          )}>
                          {col.column}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* Available relationships */}
      {availableRels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 px-3 pb-2">
          <span className="text-muted text-[10px]">
            {joins.length === 0 ? "Related:" : "Add:"}
          </span>
          {availableRels.map((rel) => (
            <button
              key={rel.target.tableName}
              onClick={() => addRelation(rel)}
              className="text-subtle hover:text-default flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors hover:bg-subtle">
              <PlusIcon className="h-2.5 w-2.5" />
              {rel.target.modelName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Filter ──────────────────────────────────────────────────────────

function FilterStep({
  filters,
  onChange,
  table,
  joins,
  schema,
}: {
  filters: FilterRow[];
  onChange: (f: FilterRow[]) => void;
  table: SchemaTable;
  joins: JoinRow[];
  schema: SchemaTable[];
}) {
  const [editing, setEditing] = useState(false);

  const allColumns = useMemo(() => {
    const main = table.columns.map((c) => ({ ...c, table: "" }));
    const joined = joins.flatMap((j) => {
      const t = schema.find((s) => s.tableName === j.table);
      return (t?.columns ?? []).map((c) => ({
        ...c,
        column: `${j.table}::${c.column}`,
        label: `${t?.modelName ?? j.table}.${c.column}`,
        table: j.table,
      }));
    });
    return [...main, ...joined];
  }, [table, joins, schema]);

  const addFilter = () => {
    onChange([
      ...filters,
      { id: uid(), column: table.columns[0]?.column ?? "", operator: "=", value: "" },
    ]);
    setEditing(true);
  };

  const updateFilter = (id: string, upd: Partial<FilterRow>) =>
    onChange(filters.map((f) => (f.id === id ? { ...f, ...upd } : f)));

  const removeFilter = (id: string) => onChange(filters.filter((f) => f.id !== id));

  const filterSummary = (f: FilterRow) => {
    const col = allColumns.find((c) => c.column === f.column);
    const colName = col?.table ? col.label : f.column;
    const ops = col ? getOperators(col) : [];
    const opLabel = ops.find(([v]) => v === f.operator)?.[1] ?? f.operator;
    if (isUnary(f.operator)) return `${colName} ${opLabel}`;
    return `${colName} ${opLabel} ${f.value || "…"}`;
  };

  return (
    <div className="border-subtle border-b">
      <SectionHeader
        title="Filter"
        count={filters.length || undefined}
        actions={
          <button
            onClick={addFilter}
            className="text-subtle hover:text-default flex items-center gap-1 text-xs transition-colors">
            <PlusIcon className="h-3 w-3" />
            Add
          </button>
        }
      />

      {/* Collapsed: show pills */}
      {filters.length > 0 && !editing && (
        <div className="flex flex-wrap items-center gap-1 px-3 pb-2">
          {filters.map((f, idx) => (
            <div key={f.id} className="flex items-center gap-1">
              {idx > 0 && <span className="text-muted text-[9px] font-semibold">AND</span>}
              <ConfigPill onRemove={() => removeFilter(f.id)} onClick={() => setEditing(true)}>
                {filterSummary(f)}
              </ConfigPill>
            </div>
          ))}
        </div>
      )}

      {/* Expanded: editable rows */}
      {editing && filters.length > 0 && (
        <div className="space-y-1.5 px-3 pb-2">
          {filters.map((f, idx) => {
            const col = allColumns.find((c) => c.column === f.column);
            const ops = col ? getOperators(col) : [];
            const hasEnum = col?.enumValues && col.enumValues.length > 0;
            const unary = isUnary(f.operator);

            return (
              <div key={f.id} className="flex items-center gap-1.5">
                <span className="text-muted w-9 shrink-0 text-right text-[10px] font-medium">
                  {idx === 0 ? "Where" : "and"}
                </span>
                <InlineSelect
                  value={f.column}
                  onChange={(v) => updateFilter(f.id, { column: v, operator: "=", value: "" })}
                  options={allColumns.map((c) => ({
                    value: c.column,
                    label: c.table ? c.label : c.column,
                  }))}
                  className="min-w-[100px]"
                />
                <InlineSelect
                  value={f.operator}
                  onChange={(v) => updateFilter(f.id, { operator: v })}
                  options={ops.map(([val, lab]) => ({ value: val, label: lab }))}
                  className="min-w-[90px]"
                />
                {!unary && (
                  <>
                    {hasEnum && f.operator !== "IN" ? (
                      <InlineSelect
                        value={f.value}
                        onChange={(v) => updateFilter(f.id, { value: v })}
                        options={(col?.enumValues ?? []).map((e) => ({ value: e, label: e }))}
                        placeholder="value…"
                        className="min-w-[80px] flex-1"
                      />
                    ) : col?.type.toLowerCase().includes("bool") ? (
                      <InlineSelect
                        value={f.value}
                        onChange={(v) => updateFilter(f.id, { value: v })}
                        options={[
                          { value: "true", label: "true" },
                          { value: "false", label: "false" },
                        ]}
                        className="w-[70px]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={f.value}
                        onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                        placeholder={
                          f.operator === "ILIKE" || f.operator === "NOT ILIKE" ? "search…" : "value…"
                        }
                        className="border-subtle bg-default text-default placeholder:text-muted h-7 min-w-[80px] flex-1 rounded border px-2 text-xs outline-none focus:border-blue-500"
                      />
                    )}
                  </>
                )}
                <button
                  onClick={() => removeFilter(f.id)}
                  className="text-muted hover:text-error shrink-0 transition-colors">
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          <div className="flex gap-2 pl-9">
            <button
              onClick={addFilter}
              className="text-subtle hover:text-default text-[11px]">
              + Add filter
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-subtle hover:text-default text-[11px]">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Summarize ───────────────────────────────────────────────────────

function SummarizeStep({
  enabled,
  onToggle,
  metrics,
  onMetricsChange,
  groupBy,
  onGroupByChange,
  columns,
}: {
  enabled: boolean;
  onToggle: () => void;
  metrics: MetricRow[];
  onMetricsChange: (m: MetricRow[]) => void;
  groupBy: string[];
  onGroupByChange: (cols: string[]) => void;
  columns: SchemaColumn[];
}) {
  const addMetric = (fn: AggFn = "COUNT") => {
    onMetricsChange([
      ...metrics,
      { id: uid(), fn, column: fn === "COUNT" ? "*" : columns[0]?.column ?? "*", alias: "" },
    ]);
    if (!enabled) onToggle();
  };

  const numericCols = columns.filter((c) =>
    /int|float|decimal|numeric/i.test(c.type)
  );

  if (!enabled) {
    return (
      <div className="border-subtle border-b">
        <SectionHeader title="Summarize" />
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          <button
            onClick={() => addMetric("COUNT")}
            className="border-subtle text-subtle hover:text-default hover:bg-subtle rounded border border-dashed px-2 py-0.5 text-[11px] transition-colors">
            Count of rows
          </button>
          {numericCols.slice(0, 2).map((col) => (
            <button
              key={`sum-${col.column}`}
              onClick={() => {
                onMetricsChange([...metrics, { id: uid(), fn: "SUM", column: col.column, alias: "" }]);
                if (!enabled) onToggle();
              }}
              className="border-subtle text-subtle hover:text-default hover:bg-subtle rounded border border-dashed px-2 py-0.5 text-[11px] transition-colors">
              Sum of {col.column}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-subtle border-b">
      <SectionHeader
        title="Summarize"
        count={metrics.length || undefined}
        actions={
          <button onClick={onToggle} className="text-subtle hover:text-default text-[10px]">
            Clear
          </button>
        }
      />

      <div className="px-3 pb-2">
        {/* Metrics */}
        <div className="mb-2 space-y-1.5">
          {metrics.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <InlineSelect
                value={m.fn}
                onChange={(v) =>
                  onMetricsChange(metrics.map((mm) => (mm.id === m.id ? { ...mm, fn: v as AggFn } : mm)))
                }
                options={[
                  { value: "COUNT", label: "Count of" },
                  { value: "SUM", label: "Sum of" },
                  { value: "AVG", label: "Average of" },
                  { value: "MIN", label: "Min of" },
                  { value: "MAX", label: "Max of" },
                ]}
                className="w-[100px]"
              />
              <InlineSelect
                value={m.column}
                onChange={(v) =>
                  onMetricsChange(metrics.map((mm) => (mm.id === m.id ? { ...mm, column: v } : mm)))
                }
                options={[
                  { value: "*", label: "all rows" },
                  ...columns.map((c) => ({ value: c.column, label: c.column })),
                ]}
                className="min-w-[90px]"
              />
              <span className="text-muted text-[10px]">as</span>
              <input
                type="text"
                value={m.alias}
                onChange={(e) =>
                  onMetricsChange(metrics.map((mm) => (mm.id === m.id ? { ...mm, alias: e.target.value } : mm)))
                }
                placeholder={`${m.fn.toLowerCase()}_${m.column === "*" ? "all" : m.column}`}
                className="border-subtle bg-default text-default placeholder:text-muted h-7 w-24 rounded border px-2 text-xs outline-none focus:border-blue-500"
              />
              <button
                onClick={() => onMetricsChange(metrics.filter((mm) => mm.id !== m.id))}
                className="text-muted hover:text-error transition-colors">
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addMetric("COUNT")}
            className="text-subtle hover:text-default text-[11px]">
            + Add metric
          </button>
        </div>

        {/* Group by */}
        <div>
          <span className="text-muted mb-1 block text-[10px] font-medium">Grouped by</span>
          <div className="flex flex-wrap gap-1">
            {columns.map((col) => {
              const on = groupBy.includes(col.column);
              return (
                <button
                  key={col.column}
                  onClick={() =>
                    on
                      ? onGroupByChange(groupBy.filter((c) => c !== col.column))
                      : onGroupByChange([...groupBy, col.column])
                  }
                  className={classNames(
                    "rounded border px-1.5 py-0 text-[10px] transition-colors",
                    on
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                      : "border-subtle text-muted hover:text-default"
                  )}>
                  {col.column}
                </button>
              );
            })}
          </div>
          {groupBy.length === 0 && (
            <span className="text-muted mt-1 block text-[10px]">Pick columns to group by</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Sort & Limit ────────────────────────────────────────────────────

function SortLimitStep({
  sorts,
  onSortsChange,
  limit,
  onLimitChange,
  columns,
}: {
  sorts: SortRow[];
  onSortsChange: (s: SortRow[]) => void;
  limit: number;
  onLimitChange: (n: number) => void;
  columns: SchemaColumn[];
}) {
  const addSort = () => {
    onSortsChange([...sorts, { id: uid(), column: columns[0]?.column ?? "", direction: "DESC" }]);
  };

  return (
    <div className="border-subtle border-b">
      <SectionHeader
        title="Sort & Limit"
        count={sorts.length || undefined}
        actions={
          <button
            onClick={addSort}
            className="text-subtle hover:text-default flex items-center gap-1 text-xs transition-colors">
            <PlusIcon className="h-3 w-3" />
            Add sort
          </button>
        }
      />

      <div className="px-3 pb-2">
        {sorts.map((s, idx) => (
          <div key={s.id} className="mb-1 flex items-center gap-1.5">
            <span className="text-muted w-9 shrink-0 text-right text-[10px]">
              {idx === 0 ? "by" : "then"}
            </span>
            <InlineSelect
              value={s.column}
              onChange={(v) =>
                onSortsChange(sorts.map((ss) => (ss.id === s.id ? { ...ss, column: v } : ss)))
              }
              options={columns.map((c) => ({ value: c.column, label: c.column }))}
              className="min-w-[100px] flex-1"
            />
            <button
              onClick={() =>
                onSortsChange(
                  sorts.map((ss) =>
                    ss.id === s.id ? { ...ss, direction: ss.direction === "ASC" ? "DESC" : "ASC" } : ss
                  )
                )
              }
              className="border-subtle bg-default text-default flex h-7 items-center gap-1 rounded border px-2 text-[11px] transition-colors hover:bg-subtle">
              {s.direction === "ASC" ? (
                <ArrowUpIcon className="h-3 w-3" />
              ) : (
                <ArrowDownIcon className="h-3 w-3" />
              )}
              {s.direction === "ASC" ? "Asc" : "Desc"}
            </button>
            <button
              onClick={() => onSortsChange(sorts.filter((ss) => ss.id !== s.id))}
              className="text-muted hover:text-error transition-colors">
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        ))}

        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-muted text-[10px]">Limit</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) onLimitChange(Math.min(1000, Math.max(1, v)));
            }}
            className="border-subtle bg-default text-default h-7 w-16 rounded border px-2 text-center text-xs outline-none focus:border-blue-500"
          />
          <span className="text-muted text-[10px]">rows</span>
        </div>
      </div>
    </div>
  );
}

// ─── SQL Generation ──────────────────────────────────────────────────────────

function generateSql({
  table,
  selectedColumns,
  filters,
  joins,
  sorts,
  limit,
  summarizeEnabled,
  groupBy,
  metrics,
  schema,
}: {
  table: SchemaTable | undefined;
  selectedColumns: string[];
  filters: FilterRow[];
  joins: JoinRow[];
  sorts: SortRow[];
  limit: number;
  summarizeEnabled: boolean;
  groupBy: string[];
  metrics: MetricRow[];
  schema: SchemaTable[];
}): string {
  if (!table) return "";

  const hasJoins = joins.some((j) => j.table && j.fromCol && j.toCol);
  const alias = hasJoins ? "t0" : "";
  const pfx = alias ? `${alias}.` : "";

  const parts: string[] = [];

  if (summarizeEnabled && (groupBy.length > 0 || metrics.length > 0)) {
    for (const col of groupBy) parts.push(`${pfx}${qi(col)}`);
    for (const m of metrics) {
      const ref = m.column === "*" ? "*" : `${pfx}${qi(m.column)}`;
      const name = m.alias || `${m.fn.toLowerCase()}_${m.column === "*" ? "all" : m.column}`;
      parts.push(`${m.fn}(${ref}) AS ${qi(name)}`);
    }
  } else {
    if (selectedColumns.length === 0) {
      parts.push(hasJoins ? `${alias}.*` : "*");
    } else {
      for (const col of selectedColumns) parts.push(`${pfx}${qi(col)}`);
    }
    for (let i = 0; i < joins.length; i++) {
      const j = joins[i];
      if (!j.table || j.columns.length === 0) continue;
      const ja = `t${i + 1}`;
      const target = schema.find((t) => t.tableName === j.table);
      for (const col of j.columns) {
        parts.push(`${ja}.${qi(col)} AS ${qi(`${target?.modelName ?? j.table}_${col}`)}`);
      }
    }
  }

  if (parts.length === 0) return "";

  const lines: string[] = [`SELECT ${parts.join(",\n       ")}`];
  lines.push(`FROM ${qi(table.tableName)}${alias ? ` ${alias}` : ""}`);

  for (let i = 0; i < joins.length; i++) {
    const j = joins[i];
    if (!j.table || !j.fromCol || !j.toCol) continue;
    const ja = `t${i + 1}`;
    lines.push(`${j.joinType} ${qi(j.table)} ${ja} ON ${alias}.${qi(j.fromCol)} = ${ja}.${qi(j.toCol)}`);
  }

  const valid = filters.filter((f) => f.column && (isUnary(f.operator) || f.value.trim()));
  if (valid.length > 0) {
    const conds = valid.map((f) => {
      let ref: string;
      if (f.column.includes("::")) {
        const [tbl, col] = f.column.split("::");
        const idx = joins.findIndex((j) => j.table === tbl);
        ref = idx >= 0 ? `t${idx + 1}.${qi(col)}` : `${pfx}${qi(f.column)}`;
      } else {
        ref = `${pfx}${qi(f.column)}`;
      }

      if (isUnary(f.operator)) return `${ref} ${f.operator}`;
      if (f.operator === "IN") return `${ref} IN (${f.value})`;

      const col = table.columns.find((c) => c.column === f.column);
      const isNum = col && /int|float|decimal|numeric|serial/i.test(col.type);
      const isBool = col && /bool/i.test(col.type);

      let val = f.value;
      if ((f.operator === "ILIKE" || f.operator === "NOT ILIKE") && !val.includes("%")) val = `%${val}%`;

      const quoted = isNum || isBool ? val : `'${val.replace(/'/g, "''")}'`;
      return `${ref} ${f.operator} ${quoted}`;
    });
    lines.push(`WHERE ${conds.join("\n  AND ")}`);
  }

  if (summarizeEnabled && groupBy.length > 0) {
    lines.push(`GROUP BY ${groupBy.map((c) => `${pfx}${qi(c)}`).join(", ")}`);
  }

  const validSorts = sorts.filter((s) => s.column);
  if (validSorts.length > 0) {
    lines.push(`ORDER BY ${validSorts.map((s) => `${pfx}${qi(s.column)} ${s.direction}`).join(", ")}`);
  }

  lines.push(`LIMIT ${limit}`);
  return lines.join("\n");
}

// ─── Bottom bar ──────────────────────────────────────────────────────────────

function BottomBar({
  sql,
  onExecute,
  isPending,
  onOpenInEditor,
}: {
  sql: string;
  onExecute: () => void;
  isPending: boolean;
  onOpenInEditor?: () => void;
}) {
  const [showSql, setShowSql] = useState(false);
  const { isCopied, copyToClipboard } = useCopy();

  return (
    <div className="border-subtle shrink-0 border-t">
      {showSql && (
        <div className="bg-subtle max-h-36 overflow-auto px-3 py-2">
          <pre className="text-default whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            {sql || <span className="text-muted italic">Select a table to start</span>}
          </pre>
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSql(!showSql)}
            className="text-subtle hover:text-default flex items-center gap-1 text-[11px] transition-colors">
            {showSql ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
            SQL
          </button>
          {showSql && (
            <button
              onClick={() => copyToClipboard(sql)}
              disabled={!sql}
              className="text-subtle hover:text-default text-[11px] transition-colors disabled:opacity-40">
              <CopyIcon className="mr-0.5 inline h-3 w-3" />
              {isCopied ? "Copied" : "Copy"}
            </button>
          )}
          {onOpenInEditor && sql && (
            <button
              onClick={onOpenInEditor}
              className="text-subtle hover:text-default flex items-center gap-1 text-[11px] transition-colors">
              <CodeIcon className="h-3 w-3" />
              Edit as SQL
            </button>
          )}
        </div>

        <button
          onClick={onExecute}
          disabled={isPending || !sql.trim()}
          className={classNames(
            "flex h-7 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors",
            isPending
              ? "bg-muted text-muted cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}>
          <PlayIcon className="h-3 w-3" />
          {isPending ? "Running…" : "Get Answer"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function SqlQueryBuilder({
  schema,
  onExecute,
  sqlMutation,
  onSqlChange,
  onAggregationChange,
  onOpenInEditor,
}: SqlQueryBuilderProps) {
  const [tableName, setTableName] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [joins, setJoins] = useState<JoinRow[]>([]);
  const [sorts, setSorts] = useState<SortRow[]>([]);
  const [limit, setLimit] = useState(100);
  const [summarizeEnabled, setSummarizeEnabled] = useState(false);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);

  const table = useMemo(() => schema.find((t) => t.tableName === tableName), [schema, tableName]);

  const handleTableChange = useCallback((name: string) => {
    setTableName(name);
    setSelectedColumns([]);
    setFilters([]);
    setJoins([]);
    setSorts([]);
    setSummarizeEnabled(false);
    setGroupBy([]);
    setMetrics([]);
  }, []);

  const generatedSql = useMemo(
    () =>
      generateSql({ table, selectedColumns, filters, joins, sorts, limit, summarizeEnabled, groupBy, metrics, schema }),
    [table, selectedColumns, filters, joins, sorts, limit, summarizeEnabled, groupBy, metrics, schema]
  );

  useEffect(() => {
    onSqlChange?.(generatedSql);
  }, [generatedSql, onSqlChange]);

  useEffect(() => {
    onAggregationChange?.(summarizeEnabled && metrics.length > 0);
  }, [summarizeEnabled, metrics.length, onAggregationChange]);

  const handleExecute = useCallback(() => {
    if (generatedSql.trim()) onExecute(generatedSql.trim());
  }, [generatedSql, onExecute]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <PickDataStep
          schema={schema}
          selectedTable={table}
          onSelect={handleTableChange}
          selectedColumns={selectedColumns}
          onColumnsChange={setSelectedColumns}
        />

        {table && (
          <>
            <JoinStep joins={joins} onChange={setJoins} primaryTable={table} schema={schema} />

            <FilterStep
              filters={filters}
              onChange={setFilters}
              table={table}
              joins={joins}
              schema={schema}
            />

            <SummarizeStep
              enabled={summarizeEnabled}
              onToggle={() => {
                setSummarizeEnabled(!summarizeEnabled);
                if (summarizeEnabled) {
                  setMetrics([]);
                  setGroupBy([]);
                }
              }}
              metrics={metrics}
              onMetricsChange={setMetrics}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              columns={table.columns}
            />

            <SortLimitStep
              sorts={sorts}
              onSortsChange={setSorts}
              limit={limit}
              onLimitChange={setLimit}
              columns={table.columns}
            />
          </>
        )}
      </div>

      {table && (
        <BottomBar
          sql={generatedSql}
          onExecute={handleExecute}
          isPending={sqlMutation.isPending}
          onOpenInEditor={onOpenInEditor}
        />
      )}
    </div>
  );
}

export type { SchemaTable, SqlMutationResult, SqlQueryBuilderProps };
