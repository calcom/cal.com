"use client";

import type { AdminTable } from "@calcom/features/admin-dataview/AdminTable";
import type { FieldDefinition } from "@calcom/features/admin-dataview/types";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableNew,
  TableRow,
} from "@calcom/ui/components/table";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  SearchIcon,
  XIcon,
} from "@coss/ui/icons";
import { keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { buildBackHref, buildRelationHref, useStudioParams } from "../hooks/useStudioParams";
import type { ColumnFilterValue } from "./ColumnFilter";
import { ColumnFilter, filterToPrismaWhere } from "./ColumnFilter";
import { DataCell } from "./DataCell";
import type { ContextMenuHandle } from "./RowActions";
import { RowContextMenu } from "./RowActions";

interface StudioTableProps {
  table: AdminTable;
  onOpenDetail?: (row: Record<string, unknown>) => void;
}
function FilterPill({
  field,
  filter,
  onRemove,
}: {
  field: FieldDefinition;
  filter: ColumnFilterValue;
  onRemove: () => void;
}) {
  let summary = "";
  switch (filter.type) {
    case "text":
      summary =
        filter.operator === "isEmpty" || filter.operator === "isNotEmpty"
          ? filter.operator
          : `${filter.operator} "${filter.value}"`;
      break;
    case "number":
      summary = `${filter.operator} ${filter.value}`;
      break;
    case "boolean":
      summary = String(filter.value);
      break;
    case "enum":
      summary = filter.values.join(", ");
      break;
    case "datetime":
      if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") {
        summary = filter.operator === "isEmpty" ? "is empty" : "is not empty";
      } else if (filter.operator === "between" && filter.valueTo) {
        summary = `${filter.operator} ${format(new Date(filter.value), "MMM d, yyyy")} – ${format(new Date(filter.valueTo), "MMM d, yyyy")}`;
      } else if (filter.value) {
        summary = `${filter.operator} ${format(new Date(filter.value), "MMM d, yyyy")}`;
      }
      break;
    case "null":
      summary = filter.isNull ? "is empty" : "is set";
      break;
  }

  return (
    <Badge variant="blue" size="sm" className="gap-1 pl-2">
      <span className="font-medium">{field.label}</span>
      <span className="opacity-70">{summary}</span>
      <button onClick={onRemove} className="hover:bg-blue-600/20 -mr-0.5 rounded p-0.5 transition-colors">
        <XIcon className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}
function Breadcrumbs({
  table,
  navStack,
}: {
  table: AdminTable;
  navStack: { slug: string; label: string; params: Record<string, unknown> }[];
}) {
  if (navStack.length === 0) return null;

  return (
    <div className="border-subtle bg-subtle/50 flex items-center gap-1.5 border-b px-4 py-1.5 text-xs">
      <Link href="/admin/data" className="text-subtle hover:text-default transition-colors">
        Studio
      </Link>
      {navStack.map((entry, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <span className="text-muted">/</span>
          <Link
            href={buildBackHref(navStack, idx)}
            className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400">
            {entry.label}
          </Link>
        </span>
      ))}
      <span className="text-muted">/</span>
      <span className="text-emphasis font-medium">{table.displayNamePlural}</span>
    </div>
  );
}
export function StudioTable({ table, onOpenDetail }: StudioTableProps) {
  const {
    search,
    setSearch,
    recordId,
    setRecordId,
    sort,
    setSort,
    dir,
    setDir,
    page,
    setPage,
    filters: columnFilters,
    setFilters: setColumnFilters,
    navStack,
  } = useStudioParams();

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [localSearch, setLocalSearch] = useState(search);
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<ContextMenuHandle>(null);
  const [focusedRowId, setFocusedRowId] = useState<string | number | null>(null);

  // Sync local search input when URL search changes (e.g. back navigation)
  const prevSearch = useRef(search);
  if (prevSearch.current !== search) {
    prevSearch.current = search;
    if (localSearch !== search) {
      setLocalSearch(search);
    }
  }

  const displayFields = useMemo(() => table.listFields, [table]);

  const sortField = sort ?? table.defaultSort;
  const sortDir = dir ?? table.defaultSortDirection;

  // PK filter from relation drill-down
  const pkColumn = table.primaryKeyColumn;
  const pkFilter = useMemo(() => {
    if (!recordId) return undefined;
    const pkFieldDef = table.primaryKeyField;
    const coerced = pkFieldDef?.type === "number" ? parseInt(recordId, 10) : recordId;
    return { [pkColumn]: coerced };
  }, [recordId, pkColumn, table.fields]);

  // Convert column filters to Prisma-compatible filters
  const prismaFilters = useMemo(() => {
    const filters: Record<string, unknown> = {};
    if (pkFilter) Object.assign(filters, pkFilter);
    for (const [column, filterValue] of Object.entries(columnFilters)) {
      Object.assign(filters, filterToPrismaWhere(column, filterValue));
    }
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [columnFilters, pkFilter]);

  const activeFilterCount = Object.keys(columnFilters).length;

  const queryInput = useMemo(
    () => ({
      slug: table.slug,
      page,
      pageSize: table.pageSize,
      sortField,
      sortDirection: sortDir,
      search: recordId ? undefined : search || undefined,
      filters: prismaFilters,
    }),
    [table.slug, page, table.pageSize, sortField, sortDir, search, recordId, prismaFilters]
  );

  const { data, isPending, isFetching, refetch } = trpc.viewer.admin.dataview.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
  });

  // True when showing stale data while fresh data loads (pagination, sort, search, filter)
  const isBackgroundLoading = isFetching && !isPending;

  const handleSearch = useCallback(
    (value: string) => {
      setLocalSearch(value);
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        setSearch(value || null);
        setPage(1);
      }, 300);
    },
    [setSearch, setPage]
  );

  const handleSort = useCallback(
    (column: string) => {
      if (sortField === column) {
        setDir(sortDir === "asc" ? "desc" : "asc");
      } else {
        setSort(column);
        setDir("asc");
      }
      setPage(1);
    },
    [sortField, sortDir, setSort, setDir, setPage]
  );

  const handleFilterChange = useCallback(
    (column: string, value: ColumnFilterValue | null) => {
      const next = { ...columnFilters };
      if (value === null) {
        delete next[column];
      } else {
        next[column] = value;
      }
      setColumnFilters(next);
      setPage(1);
    },
    [columnFilters, setColumnFilters, setPage]
  );

  const handleClearAllFilters = useCallback(() => {
    setColumnFilters({});
    setPage(1);
  }, [setColumnFilters, setPage]);

  // Snapshot current params for nav stack
  const currentParams = useMemo(
    () => ({
      search: search || undefined,
      sort: sort ?? undefined,
      dir: dir ?? undefined,
      page: page > 1 ? page : undefined,
      filters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
    }),
    [search, sort, dir, page, columnFilters]
  );

  const rows = data?.rows ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const isEstimate = data?.isEstimate ?? false;
  const pageSize = table.pageSize;

  return (
    <div className="grid overflow-hidden" style={{ gridTemplateRows: "auto minmax(0, 1fr) auto" }}>
      <Breadcrumbs table={table} navStack={navStack} />

      {/* ── Toolbar ── */}
      <div className="border-subtle bg-default flex flex-col gap-2 border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {navStack.length > 0 && (
              <Link
                href={buildBackHref(navStack, navStack.length - 1)}
                className="text-subtle hover:text-default -ml-1 rounded p-1 transition-colors"
                title="Go back">
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>
            )}
            <h2 className="text-emphasis text-base font-semibold">{table.displayNamePlural}</h2>
            <Badge
              variant="gray"
              size="sm"
              title={isEstimate ? "Approximate count from database statistics" : undefined}>
              {isPending ? "…" : `${isEstimate ? "~" : ""}${total.toLocaleString()}`} rows
            </Badge>
            {activeFilterCount > 0 && (
              <Badge variant="blue" size="sm">
                <FilterIcon className="mr-1 h-3 w-3" />
                {activeFilterCount} filter{activeFilterCount !== 1 && "s"}
              </Badge>
            )}
          </div>
          <div className="relative">
            <SearchIcon className="text-muted absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${table.displayNamePlural.toLowerCase()}…`}
              className="border-subtle bg-default text-default placeholder:text-muted h-8 w-64 rounded-md border py-1 pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Record ID badge (from relation drill-down) */}
        {recordId && (
          <div className="flex items-center gap-1.5">
            <Badge variant="orange" size="sm" className="gap-1 pl-2">
              <span className="font-medium">{pkColumn}</span>
              <span className="opacity-70">= {recordId}</span>
              <button
                onClick={() => setRecordId(null)}
                className="hover:bg-orange-600/20 -mr-0.5 rounded p-0.5 transition-colors">
                <XIcon className="h-2.5 w-2.5" />
              </button>
            </Badge>
            <Link
              href={`/admin/data/${table.slug}`}
              className="text-subtle hover:text-default text-xs underline">
              Show all
            </Link>
          </div>
        )}

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(columnFilters).map(([column, filter]) => {
              const field = displayFields.find((f) => f.column === column);
              if (!field) return null;
              return (
                <FilterPill
                  key={column}
                  field={field}
                  filter={filter}
                  onRemove={() => handleFilterChange(column, null)}
                />
              );
            })}
            <button
              onClick={handleClearAllFilters}
              className="text-subtle hover:text-default text-xs underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Spreadsheet grid ── */}
      <div ref={containerRef} className="relative overflow-auto">
        {/* Loading overlay for pagination / sort / search transitions */}
        {isBackgroundLoading && (
          <div className="bg-emphasis absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse" />
        )}
        <TableNew className="border-0">
          <TableHeader className="bg-subtle sticky top-0 z-10">
            <TableRow className="hover:bg-subtle border-0">
              <TableHead className="border-subtle text-muted w-12 border-r text-right font-mono text-[10px]">
                #
              </TableHead>
              {displayFields.map((field) => (
                <TableHead
                  key={field.column}
                  className="group/header border-subtle border-r text-xs transition-colors"
                  title={field.description ?? field.label}>
                  <div className="flex items-center gap-1.5">
                    <button
                      className={classNames(
                        "flex min-w-0 flex-1 items-center gap-1.5",
                        !field.relation && "cursor-pointer hover:opacity-80"
                      )}
                      onClick={() => !field.relation && handleSort(field.column)}>
                      <span
                        className={classNames(
                          "truncate",
                          field.relation ? "text-blue-600 dark:text-blue-400" : "text-default"
                        )}>
                        {field.label}
                      </span>
                      <span className="text-muted shrink-0 text-[9px] uppercase tracking-wider">
                        {field.relation ? "join" : field.type}
                      </span>
                      {!field.relation &&
                        sortField === field.column &&
                        (sortDir === "asc" ? (
                          <ArrowUpIcon className="h-3 w-3 shrink-0 text-blue-500" />
                        ) : (
                          <ArrowDownIcon className="h-3 w-3 shrink-0 text-blue-500" />
                        ))}
                    </button>

                    {!field.relation && (
                      <ColumnFilter
                        field={field}
                        value={columnFilters[field.column] ?? null}
                        onChange={(v) => handleFilterChange(field.column, v)}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody
            className={classNames(isBackgroundLoading && "opacity-60 transition-opacity duration-150")}>
            {isPending && rows.length === 0
              ? Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    <TableCell className="border-subtle border-r text-right">
                      <div className="bg-muted h-3 w-6 animate-pulse rounded" />
                    </TableCell>
                    {displayFields.map((field) => (
                      <TableCell key={field.column} className="border-subtle border-r">
                        <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.length === 0
                ? (() => (
                    <TableRow>
                      <TableCell
                        colSpan={displayFields.length + 1}
                        className="text-muted py-12 text-center text-sm">
                        {activeFilterCount > 0 || search || recordId
                          ? "No records match the current search/filters"
                          : "No records found"}
                      </TableCell>
                    </TableRow>
                  ))()
                : rows.map((row, idx) => {
                    const pkField = table.primaryKeyField;
                    const pk = row[pkField?.column ?? "id"];
                    const rowNum = (page - 1) * pageSize + idx + 1;

                    return (
                      <TableRow
                        key={String(pk ?? idx)}
                        className={classNames(
                          "group cursor-pointer border-0",
                          focusedRowId === pk && "!bg-blue-50 dark:!bg-blue-950/30"
                        )}
                        onClick={() => onOpenDetail?.(row)}
                        onContextMenu={(e) => {
                          if ((table.actions?.length ?? 0) > 0) {
                            e.preventDefault();
                            setFocusedRowId(pk as string | number);
                            contextMenuRef.current?.open(e, row);
                          }
                        }}>
                        <TableCell className="border-subtle text-muted w-12 border-r py-0 text-right font-mono text-[10px]">
                          {rowNum}
                        </TableCell>
                        {displayFields.map((field) => (
                          <TableCell
                            key={field.column}
                            className="border-subtle border-r p-0"
                            style={{
                              minWidth: field.type === "datetime" ? 180 : 100,
                              maxWidth: 300,
                            }}>
                            <DataCell
                              field={field}
                              value={row[field.column]}
                              relationHref={
                                field.relation
                                  ? buildRelationCellHref(
                                      field,
                                      row[field.column],
                                      table,
                                      currentParams,
                                      navStack
                                    )
                                  : undefined
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
          </TableBody>
        </TableNew>
      </div>

      {/* ── Footer ── */}
      <div className="border-subtle bg-default flex items-center justify-between border-t px-4 py-2">
        <span className="text-subtle text-xs">
          {rows.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of{" "}
          {isEstimate ? "~" : ""}
          {total.toLocaleString()}
        </span>

        <div className="flex items-center gap-1">
          <button
            className="hover:bg-subtle text-default disabled:text-muted rounded p-1 disabled:cursor-not-allowed"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage(page - 1)}>
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="text-default mx-2 text-xs tabular-nums">
            {isFetching ? (
              <span className="text-subtle animate-pulse">Loading…</span>
            ) : (
              `${page} / ${totalPages}`
            )}
          </span>
          <button
            className="hover:bg-subtle text-default disabled:text-muted rounded p-1 disabled:cursor-not-allowed"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage(page + 1)}>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        <div />
      </div>

      <RowContextMenu
        table={table}
        onActionComplete={() => refetch()}
        onMenuClose={() => setFocusedRowId(null)}
        contextRef={contextMenuRef}
      />
    </div>
  );
}
function buildRelationCellHref(
  field: FieldDefinition,
  cellValue: unknown,
  currentTable: AdminTable,
  currentParams: Record<string, unknown>,
  navStack: { slug: string; label: string; params: Record<string, unknown> }[]
): string | undefined {
  if (!field.relation?.linkTo) return undefined;
  if (cellValue == null || typeof cellValue !== "object") return undefined;

  const rel = cellValue as { _relation?: boolean; _linkSlug?: string; _linkParam?: string | number };
  if (!rel._relation || !rel._linkSlug || rel._linkParam == null) return undefined;

  return buildRelationHref({
    targetSlug: rel._linkSlug,
    targetId: rel._linkParam,
    currentSlug: currentTable.slug,
    currentLabel: currentTable.displayNamePlural,
    currentParams: currentParams as any,
    currentNavStack: navStack as any,
  });
}
