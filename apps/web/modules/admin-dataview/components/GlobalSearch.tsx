"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { localStorage } from "@calcom/lib/webstorage";

import type { AdminTable } from "@calcom/features/admin-dataview/AdminTable";
import { registry } from "@calcom/features/admin-dataview/registry";
import type {
  GlobalSearchResult,
  GlobalSearchTableResult,
} from "@calcom/features/admin-dataview/server/service";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import {
  CommandDialog,
  CommandDialogPopup,
} from "@coss/ui/components/command";
import { Kbd } from "@coss/ui/components/kbd";
import {
  SearchIcon,
  LoaderIcon,
  UsersIcon,
  CreditCardIcon,
  ShieldIcon,
  LayersIcon,
  Grid3x3Icon,
  ArrowRightIcon,
  CornerDownRightIcon,
} from "@coss/ui/icons";

const RECENT_SELECTIONS_KEY = "admin-global-search-recent";
const MAX_RECENT = 10;

function loadRecentSelections(): SearchResultItem[] {
  try {
    const raw = localStorage?.getItem(RECENT_SELECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSelections(items: SearchResultItem[]) {
  try {
    localStorage?.setItem(RECENT_SELECTIONS_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    // noop
  }
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  core: UsersIcon,
  billing: CreditCardIcon,
  platform: LayersIcon,
  abuse: ShieldIcon,
  system: Grid3x3Icon,
};

interface SearchResultItem {
  slug: string;
  pk: string | number;
  label: string;
  sublabel: string;
  category: string;
  displayNamePlural: string;
}

/**
 * Trigger button shown in the sidebar that opens the ⌘K command palette.
 */
export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "border-subtle bg-default text-muted hover:text-default hover:border-default",
        "mx-2 mt-2 flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs transition-all",
        "hover:bg-subtle"
      )}>
      <SearchIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-left">Search records…</span>
      <Kbd className="text-[9px]">⌘K</Kbd>
    </button>
  );
}

/**
 * Full ⌘K command palette dialog for searching across all admin tables.
 */
export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSelections, setRecentSelections] = useState<SearchResultItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      setRecentSelections(loadRecentSelections());
      // Focus input after dialog animation
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, []);

  // Debounce
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 300);
  }, []);

  // tRPC query
  const { data, isPending } = trpc.viewer.admin.globalSearch.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 1 }
  );

  // Flatten results into a single navigable list
  const flatResults = useMemo<SearchResultItem[]>(() => {
    if (!data?.results) return [];
    const items: SearchResultItem[] = [];
    for (const tableResult of data.results) {
      const table = registry.getBySlug(tableResult.slug);
      if (!table) continue;
      for (const row of tableResult.rows) {
        const pk = extractPk(table, row);
        items.push({
          slug: tableResult.slug,
          pk,
          label: extractLabel(table, row),
          sublabel: extractSublabel(table, row),
          category: tableResult.category,
          displayNamePlural: tableResult.displayNamePlural,
        });
      }
    }
    return items;
  }, [data]);

  // Group results for rendering
  const groupedResults = useMemo<(GlobalSearchTableResult & { items: SearchResultItem[] })[]>(() => {
    if (!data?.results) return [];
    return data.results.map((tableResult) => ({
      ...tableResult,
      items: flatResults.filter((item) => item.slug === tableResult.slug),
    }));
  }, [data, flatResults]);

  // Reset selection on results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatResults.length, debouncedQuery]);

  const addRecentSelection = useCallback((item: SearchResultItem) => {
    setRecentSelections((prev) => {
      const filtered = prev.filter((r) => !(r.slug === item.slug && r.pk === item.pk));
      const updated = [item, ...filtered].slice(0, MAX_RECENT);
      saveRecentSelections(updated);
      return updated;
    });
  }, []);

  const clearRecentSelections = useCallback(() => {
    setRecentSelections([]);
    saveRecentSelections([]);
  }, []);

  // Items to show: search results when querying, recent selections when idle
  const activeItems = useMemo(() => {
    if (debouncedQuery.length >= 1) return flatResults;
    if (!query.trim()) return recentSelections;
    return [];
  }, [debouncedQuery, query, flatResults, recentSelections]);

  const navigate = useCallback(
    (item: SearchResultItem) => {
      addRecentSelection(item);
      onOpenChange(false);
      router.push(`/admin/data/${item.slug}?id=${item.pk}`);
    },
    [router, onOpenChange, addRecentSelection]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (activeItems.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, activeItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (activeItems[selectedIndex]) {
            navigate(activeItems[selectedIndex]);
          }
          break;
      }
    },
    [activeItems, selectedIndex, navigate]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-result-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, open]);

  const isLoading = isPending && debouncedQuery.length >= 1;
  const hasResults = flatResults.length > 0;
  const showEmpty = !isLoading && debouncedQuery.length >= 1 && !hasResults;
  const showRecent = debouncedQuery.length === 0 && !query.trim() && recentSelections.length > 0;
  const showHint = debouncedQuery.length === 0 && !query.trim() && recentSelections.length === 0;

  let flatIndex = 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandDialogPopup>
        {/* ── Search input ── */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {isLoading ? (
            <LoaderIcon className="text-muted-foreground h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <SearchIcon className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by ID, email, name, slug…"
            className="text-foreground placeholder:text-muted-foreground h-6 flex-1 border-0 bg-transparent text-sm outline-none"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
                inputRef.current?.focus();
              }}>
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        {/* ── Results area ── */}
        <div
          ref={listRef}
          className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain">
          {/* Recent selections */}
          {showRecent && (
            <div>
              <div className="bg-popover sticky top-0 z-10 flex items-center gap-2 px-4 py-2">
                <SearchIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                <span className="text-muted-foreground text-xs font-medium">Recent</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground ml-auto text-[10px] opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecentSelections();
                    inputRef.current?.focus();
                  }}>
                  Clear all
                </button>
              </div>
              {recentSelections.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = CATEGORY_ICONS[item.category] ?? Grid3x3Icon;
                return (
                  <button
                    key={`recent-${item.slug}-${item.pk}`}
                    type="button"
                    data-result-index={idx}
                    className={classNames(
                      "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/50"
                    )}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}>
                    <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{item.label}</span>
                        <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                          #{String(item.pk)}
                        </span>
                      </div>
                      {item.sublabel && (
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {item.displayNamePlural}
                    </span>
                    {isSelected && (
                      <CornerDownRightIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Idle hint */}
          {showHint && (
            <div className="px-4 py-10 text-center">
              <div className="bg-muted mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full">
                <SearchIcon className="text-muted-foreground h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-sm">Search across all tables</p>
              <p className="text-muted-foreground/72 mt-1 text-xs">
                Try an ID like <kbd className="bg-muted rounded px-1 font-mono text-[11px]">132</kbd>,
                an email like{" "}
                <kbd className="bg-muted rounded px-1 font-mono text-[11px]">@test.com</kbd>, or any
                name or slug
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && !hasResults && (
            <div className="flex items-center justify-center py-10">
              <LoaderIcon className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="px-4 py-10 text-center">
              <p className="text-muted-foreground text-sm">
                No results for &ldquo;{debouncedQuery}&rdquo;
              </p>
              <p className="text-muted-foreground/72 mt-1 text-xs">
                Try searching by ID, email, name, or slug
              </p>
            </div>
          )}

          {/* Grouped results */}
          {hasResults &&
            groupedResults.map((group) => {
              if (group.items.length === 0) return null;
              const Icon = CATEGORY_ICONS[group.category] ?? Grid3x3Icon;

              return (
                <div key={group.slug}>
                  {/* Group header */}
                  <div className="bg-popover flex items-center gap-2 px-4 py-2 sticky top-0 z-10">
                    <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="text-muted-foreground text-xs font-medium">
                      {group.displayNamePlural}
                    </span>
                    <Badge variant="gray" size="sm" className="text-[9px]">
                      {group.total > group.items.length
                        ? `${group.items.length} of ${group.total}`
                        : String(group.total)}
                    </Badge>
                    {group.total > group.items.length && (
                      <button
                        type="button"
                        className="text-foreground hover:text-accent-foreground ml-auto flex items-center gap-0.5 text-[10px] opacity-60 hover:opacity-100"
                        onClick={() => {
                          onOpenChange(false);
                          router.push(
                            `/admin/data/${group.slug}?search=${encodeURIComponent(debouncedQuery)}`
                          );
                        }}>
                        View all
                        <ArrowRightIcon className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>

                  {/* Items */}
                  {group.items.map((item) => {
                    const currentIndex = flatIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <button
                        key={`${item.slug}-${item.pk}`}
                        type="button"
                        data-result-index={currentIndex}
                        className={classNames(
                          "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent/50"
                        )}
                        onClick={() => navigate(item)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{item.label}</span>
                            <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                              #{String(item.pk)}
                            </span>
                          </div>
                          {item.sublabel && (
                            <p className="text-muted-foreground mt-0.5 truncate text-xs">
                              {item.sublabel}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CornerDownRightIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 text-xs">
          <div className="text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd className="text-[9px]">↑↓</Kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd className="text-[9px]">↵</Kbd>
              <span>open</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd className="text-[9px]">esc</Kbd>
              <span>close</span>
            </span>
          </div>
          <span className="text-muted-foreground/72 text-[10px]">
            {registry.count} tables indexed
          </span>
        </div>
      </CommandDialogPopup>
    </CommandDialog>
  );
}

/** Extract primary key from a row */
function extractPk(table: AdminTable, row: Record<string, unknown>): string | number {
  const pkCol = table.primaryKeyColumn;
  const val = row[pkCol];
  return typeof val === "number" || typeof val === "string" ? val : String(val);
}

/** Extract a human-readable label from a row */
function extractLabel(table: AdminTable, row: Record<string, unknown>): string {
  for (const col of ["name", "title", "email", "username", "slug", "value", "subscriberUrl"]) {
    const val = row[col];
    if (typeof val === "string" && val.length > 0) return val;
  }
  return `${table.displayName} #${extractPk(table, row)}`;
}

/** Extract a secondary description line */
function extractSublabel(_table: AdminTable, row: Record<string, unknown>): string {
  const parts: string[] = [];

  if (row.name && row.email && typeof row.email === "string") {
    parts.push(row.email);
  }
  if (row.username && typeof row.username === "string" && row.username !== row.name) {
    parts.push(`@${row.username}`);
  }
  if (row.status && typeof row.status === "string") {
    parts.push(row.status);
  }
  if (row.role && typeof row.role === "string") {
    parts.push(row.role);
  }

  return parts.join(" · ");
}
