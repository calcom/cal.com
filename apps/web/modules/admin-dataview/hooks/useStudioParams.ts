"use client";

import { useCallback } from "react";
import {
  useQueryState,
  useQueryStates,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  parseAsJson,
} from "nuqs";

import type { ColumnFilterValue } from "../components/ColumnFilter";
const sortDirParser = parseAsStringEnum<"asc" | "desc">(["asc", "desc"]);

/**
 * All studio table state synced to URL query params via nuqs.
 * Produces URLs like:
 *   /admin/data/users?search=john&sort=email&dir=asc&page=2&filters=...
 *
 * Every param is optional — defaults come from the table definition.
 */
export function useStudioParams() {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  /** Direct primary key lookup — used when drilling into a relation */
  const [recordId, setRecordId] = useQueryState("id", parseAsString);
  const [sort, setSort] = useQueryState("sort", parseAsString);
  const [dir, setDir] = useQueryState("dir", sortDirParser);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [filters, setFilters] = useQueryState(
    "filters",
    parseAsJson<Record<string, ColumnFilterValue>>((val) => {
      // Basic validation — must be an object
      if (val && typeof val === "object" && !Array.isArray(val)) {
        return val as Record<string, ColumnFilterValue>;
      }
      return null;
    })
  );

  // Navigation stack for drill-down breadcrumbs
  // Stored as JSON array of { slug, label, params } entries
  const [navStack, setNavStack] = useQueryState(
    "from",
    parseAsJson<NavEntry[]>((val) => {
      if (Array.isArray(val)) return val as NavEntry[];
      return null;
    })
  );

  return {
    search,
    setSearch,
    /** Direct PK lookup (e.g. from clicking a relation link) */
    recordId,
    setRecordId,
    sort,
    setSort,
    dir,
    setDir,
    page,
    setPage,
    filters: filters ?? {},
    setFilters: useCallback(
      (f: Record<string, ColumnFilterValue>) => {
        setFilters(Object.keys(f).length > 0 ? f : null);
      },
      [setFilters]
    ),
    navStack: navStack ?? [],
    setNavStack,
  };
}
export interface NavEntry {
  /** Table slug we came from */
  slug: string;
  /** Human label for the breadcrumb */
  label: string;
  /** Snapshot of URL params to restore on "back" */
  params: {
    search?: string;
    sort?: string;
    dir?: "asc" | "desc";
    page?: number;
    filters?: Record<string, ColumnFilterValue>;
  };
}

/**
 * Build an href for navigating to a related record.
 * Pushes the current table state onto the nav stack so the user can go back.
 */
export function buildRelationHref({
  targetSlug,
  targetId,
  currentSlug,
  currentLabel,
  currentParams,
  currentNavStack,
}: {
  targetSlug: string;
  targetId: string | number;
  currentSlug: string;
  currentLabel: string;
  currentParams: NavEntry["params"];
  currentNavStack: NavEntry[];
}): string {
  const newStack: NavEntry[] = [
    ...currentNavStack,
    { slug: currentSlug, label: currentLabel, params: currentParams },
  ];

  const url = new URL(`/admin/data/${targetSlug}`, "http://placeholder");
  url.searchParams.set("id", String(targetId));
  url.searchParams.set("from", JSON.stringify(newStack));
  return url.pathname + url.search;
}

/**
 * Build an href to go back to a previous breadcrumb entry.
 * Truncates the nav stack to that point.
 */
export function buildBackHref(navStack: NavEntry[], targetIndex: number): string {
  const entry = navStack[targetIndex];
  if (!entry) return "/admin/data";

  const remainingStack = navStack.slice(0, targetIndex);
  const url = new URL(`/admin/data/${entry.slug}`, "http://placeholder");

  if (entry.params.search) url.searchParams.set("search", entry.params.search);
  if (entry.params.sort) url.searchParams.set("sort", entry.params.sort);
  if (entry.params.dir) url.searchParams.set("dir", entry.params.dir);
  if (entry.params.page && entry.params.page > 1) url.searchParams.set("page", String(entry.params.page));
  if (entry.params.filters && Object.keys(entry.params.filters).length > 0) {
    url.searchParams.set("filters", JSON.stringify(entry.params.filters));
  }
  if (remainingStack.length > 0) {
    url.searchParams.set("from", JSON.stringify(remainingStack));
  }

  return url.pathname + url.search;
}
