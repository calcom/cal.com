"use client";

import { useCallback, useMemo, useState } from "react";

import type { FieldDefinition } from "@calcom/features/admin-dataview/types";
import type { AdminTable } from "@calcom/features/admin-dataview/AdminTable";
import { registry } from "@calcom/features/admin-dataview/registry";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Button } from "@coss/ui/components/button";
import { ExternalLinkIcon, ArrowLeftIcon, ChevronRightIcon, LoaderIcon, Columns3Icon, XIcon } from "@coss/ui/icons";
import { trpc } from "@calcom/trpc/react";

import { PanelRenderer } from "./panels/PanelRenderer";
import { DialogActions } from "./RowActions";
interface StackEntry {
  table: AdminTable;
  row: Record<string, unknown>;
  label: string;
}
interface RecordDetailModalProps {
  table: AdminTable;
  row: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "dialog" = centered modal (default), "pinned" = inline right panel */
  mode?: "dialog" | "pinned";
  onPin?: () => void;
  onUnpin?: () => void;
}

export function RecordDetailModal({ table, row, open, onOpenChange, mode = "dialog", onPin, onUnpin }: RecordDetailModalProps) {
  const pkField = table.fields.find((f) => f.isPrimary);
  const pkValue = row?.[pkField?.column ?? "id"];

  const [stack, setStack] = useState<StackEntry[]>([]);

  // Reset stack when root record changes (e.g. clicking a different row while pinned)
  const rowId = row?.[pkField?.column ?? "id"];
  const [prevRowId, setPrevRowId] = useState(rowId);
  if (rowId !== prevRowId) {
    setPrevRowId(rowId);
    if (stack.length > 0) setStack([]);
  }

  const current: StackEntry | null =
    stack.length > 0
      ? stack[stack.length - 1]
      : row
        ? { table, row, label: `${table.displayName} #${pkValue ?? ""}` }
        : null;

  const pushTo = useCallback((entry: StackEntry) => {
    setStack((prev) => [...prev, entry]);
  }, []);

  const popTo = useCallback((index: number) => {
    setStack((prev) => prev.slice(0, index));
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setStack([]);
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  if (!current) return null;

  const header = (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <h3 className="text-emphasis truncate text-base font-semibold">{current.label}</h3>
        <p className="text-subtle text-xs">{current.table.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {mode === "dialog" && onPin && (
          <button onClick={onPin} className="text-muted hover:text-default rounded p-1 transition-colors" title="Pin to side">
            <Columns3Icon className="h-4 w-4" />
          </button>
        )}
        {mode === "pinned" && onUnpin && (
          <button onClick={onUnpin} className="text-muted hover:text-default rounded p-1 transition-colors" title="Unpin">
            <Columns3Icon className="h-4 w-4 text-blue-500" />
          </button>
        )}
        {mode === "pinned" && (
          <button onClick={() => handleOpenChange(false)} className="text-muted hover:text-default rounded p-1 transition-colors" title="Close">
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const breadcrumbs = stack.length > 0 ? (
    <Breadcrumbs
      initial={{ label: `${table.displayName} #${pkValue ?? ""}` }}
      stack={stack}
      onNavigate={popTo}
    />
  ) : null;

  const footer = (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex shrink-0 items-center gap-1">
        {stack.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => popTo(stack.length - 1)}>
            <ArrowLeftIcon className="mr-1 h-3.5 w-3.5" />
            Back
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto">
        {current.row && (current.table.actions?.length ?? 0) > 0 && (
          <DialogActions table={current.table} row={current.row} />
        )}
        {mode === "dialog" && (
          <DialogClose render={<Button variant="outline" size="sm" />}>Close</DialogClose>
        )}
      </div>
    </div>
  );

  if (mode === "pinned") {
    return (
      <div className="border-subtle bg-default grid min-w-0 overflow-hidden" style={{ gridTemplateRows: "auto minmax(0, 1fr) auto" }}>
        <div className="min-w-0 border-b border-subtle px-3 py-2">{header}</div>
        <div className="no-scrollbar min-w-0 overflow-y-auto overflow-x-hidden p-3">
          {breadcrumbs}
          <RecordContent table={current.table} row={current.row} onPush={pushTo} />
        </div>
        <div className="min-w-0 border-t border-subtle px-3 py-2">{footer}</div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup className="sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle>{current.label}</DialogTitle>
              <DialogDescription>{current.table.description}</DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {onPin && (
                <button onClick={onPin} className="text-muted hover:text-default rounded p-1.5 transition-colors" title="Pin to side">
                  <Columns3Icon className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => handleOpenChange(false)} className="text-muted hover:text-default rounded p-1.5 transition-colors" title="Close">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DialogHeader>
        <DialogPanel className="max-h-[70vh] overflow-y-auto">
          {breadcrumbs}
          <RecordContent table={current.table} row={current.row} onPush={pushTo} />
        </DialogPanel>
        <DialogFooter>{footer}</DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
function Breadcrumbs({
  initial,
  stack,
  onNavigate,
}: {
  initial: { label: string };
  stack: StackEntry[];
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1 text-xs">
      <button
        onClick={() => onNavigate(0)}
        className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400">
        {initial.label}
      </button>
      {stack.map((entry, idx) => (
        <span key={idx} className="flex items-center gap-1">
          <ChevronRightIcon className="text-muted h-3 w-3" />
          {idx === stack.length - 1 ? (
            <span className="text-emphasis font-medium">{entry.label}</span>
          ) : (
            <button
              onClick={() => onNavigate(idx + 1)}
              className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400">
              {entry.label}
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
function RecordContent({
  table,
  row,
  onPush,
}: {
  table: AdminTable;
  row: Record<string, unknown>;
  onPush: (entry: StackEntry) => void;
}) {
  const { scalarFields, toOneFields, toManyFields } = useFieldGroups(table);
  const pkField = table.fields.find((f) => f.isPrimary);
  const pkValue = row[pkField?.column ?? "id"];

  // Fetch reverse relations metadata
  const { data: reverseRels } = trpc.viewer.admin.dataview.reverseRelations.useQuery(
    { slug: table.slug, id: pkValue as string | number },
    { enabled: pkValue != null }
  );

  // Build a set of model names covered by forward to-many relations to deduplicate
  const forwardToManyModels = useMemo(() => {
    const set = new Set<string>();
    for (const field of toManyFields) {
      if (field.relation?.modelName) set.add(field.relation.modelName);
      // Also add by linkTo slug if present
      if (field.relation?.linkTo?.slug) set.add(field.relation.linkTo.slug);
    }
    return set;
  }, [toManyFields]);

  // Filter out reverse relations that are already shown as forward to-many
  const uniqueReverseRels = useMemo(() => {
    if (!reverseRels) return [];
    return reverseRels.filter((r) => {
      // Check both the source slug and the source table's model name
      return !forwardToManyModels.has(r.sourceSlug) && !forwardToManyModels.has(r.sourceModelName);
    });
  }, [reverseRels, forwardToManyModels]);

  const totalRelationCount = toOneFields.length + toManyFields.length + uniqueReverseRels.length;

  return (
    <>
      <div className="space-y-0.5">
        <SectionHeader label="Fields" count={scalarFields.length} />
        <div className="divide-subtle divide-y rounded-md border border-subtle">
          {scalarFields.map((field) => (
            <FieldRow key={field.column} field={field} value={row[field.column]} />
          ))}
        </div>
      </div>

      {totalRelationCount > 0 && (
        <div className="mt-4 space-y-3">
          <SectionHeader label="Relations" count={totalRelationCount} />

          {/* To-one forward relations (inline data) */}
          {toOneFields.map((field) => (
            <RelationSection key={field.column} field={field} value={row[field.column]} onPush={onPush} />
          ))}

          {/* To-many forward relations (inline data from join) */}
          {toManyFields.map((field) => (
            <RelationSection key={field.column} field={field} value={row[field.column]} onPush={onPush} />
          ))}

          {/* Reverse relations (lazy-loaded, same UI) */}
          {pkValue != null &&
            uniqueReverseRels.map((rel) => (
              <ManyRelationTable
                key={`${rel.sourceSlug}-${rel.fkColumn}`}
                label={rel.label}
                drillDownSlug={rel.sourceSlug}
                onPush={onPush}
                remote={{
                  sourceSlug: rel.sourceSlug,
                  fkColumn: rel.fkColumn,
                  fkValue: pkValue as string | number,
                }}
              />
            ))}
        </div>
      )}

      {/* Custom panels (billing, etc.) */}
      {table.panels && table.panels.length > 0 && (
        <div className="mt-4 space-y-3">
          {table.panels.map((panel) => (
            <PanelRenderer key={panel.id} panel={panel} row={row} />
          ))}
        </div>
      )}
    </>
  );
}
function DrillDownLink({
  slug,
  id,
  label,
  children,
  onPush,
}: {
  slug: string;
  id: string | number;
  label: string;
  children: React.ReactNode;
  onPush: (entry: StackEntry) => void;
}) {
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  const handleClick = async () => {
    const targetTable = registry.getBySlug(slug);
    if (!targetTable) return;

    setLoading(true);
    try {
      const data = await utils.viewer.admin.dataview.getById.fetch({ slug, id });
      if (data) {
        onPush({ table: targetTable, row: data, label });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 text-left text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-60 dark:text-blue-400">
      {children}
      {loading ? (
        <LoaderIcon className="h-2.5 w-2.5 shrink-0 animate-spin" />
      ) : (
        <ExternalLinkIcon className="h-2.5 w-2.5 shrink-0" />
      )}
    </button>
  );
}
function useFieldGroups(table: AdminTable) {
  return useMemo(() => {
    const scalar: FieldDefinition[] = [];
    const toOne: FieldDefinition[] = [];
    const toMany: FieldDefinition[] = [];
    for (const field of table.fields) {
      if (field.access === "hidden") continue;
      if (field.relation) {
        if (field.relation.many) {
          toMany.push(field);
        } else {
          toOne.push(field);
        }
      } else {
        scalar.push(field);
      }
    }
    return { scalarFields: scalar, toOneFields: toOne, toManyFields: toMany };
  }, [table.fields]);
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-subtle text-xs font-medium uppercase tracking-wider">{label}</span>
      <Badge variant="gray" size="sm">
        {count}
      </Badge>
    </div>
  );
}

function FieldRow({ field, value }: { field: FieldDefinition; value: unknown }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 text-xs">
      <div className="flex w-40 shrink-0 items-center gap-1.5 pt-0.5">
        <span className="text-subtle font-medium">{field.label}</span>
        <span className="text-muted text-[9px] uppercase">{field.type}</span>
      </div>
      <div className="min-w-0 flex-1">
        <FieldValue field={field} value={value} />
      </div>
    </div>
  );
}
function RelationSection({
  field,
  value,
  onPush,
}: {
  field: FieldDefinition;
  value: unknown;
  onPush: (entry: StackEntry) => void;
}) {
  const rel = value as {
    _relation?: boolean;
    _many?: boolean;
    _display?: string;
    _count?: number;
    _items?: Record<string, unknown>[];
    _data?: Record<string, unknown>;
    _linkSlug?: string;
    _linkParam?: string | number;
  } | null;

  const isNull = !rel || !rel._relation;

  if (isNull) {
    return (
      <div className="rounded-md border border-subtle">
        <div className="flex items-center gap-2 px-3 py-2 text-xs">
          <span className="font-medium text-blue-600 dark:text-blue-400">{field.label}</span>
          <span className="text-muted italic">null</span>
        </div>
      </div>
    );
  }

  if (rel._many) {
    return (
      <ManyRelationTable
        label={field.label}
        drillDownSlug={field.relation?.linkTo?.slug}
        onPush={onPush}
        inline={{ items: rel._items ?? [], total: rel._count ?? (rel._items?.length ?? 0) }}
      />
    );
  }

  return <ToOneRelation field={field} rel={rel} onPush={onPush} />;
}
function ToOneRelation({
  field,
  rel,
  onPush,
}: {
  field: FieldDefinition;
  rel: { _data?: Record<string, unknown>; _display?: string; _linkSlug?: string; _linkParam?: string | number };
  onPush: (entry: StackEntry) => void;
}) {
  const canDrillDown = rel._linkSlug && rel._linkParam != null;
  const targetTable = canDrillDown ? registry.getBySlug(rel._linkSlug!) : null;

  return (
    <div className="rounded-md border border-subtle">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-blue-600 dark:text-blue-400">{field.label}</span>
          {canDrillDown && targetTable ? (
            <DrillDownLink
              slug={rel._linkSlug!}
              id={rel._linkParam!}
              label={`${targetTable.displayName} #${rel._linkParam}`}
              onPush={onPush}>
              {rel._display}
            </DrillDownLink>
          ) : (
            <span className="text-default">{rel._display}</span>
          )}
        </div>
      </div>

      {rel._data && (
        <div className="border-subtle border-t bg-subtle/30 px-3 py-2">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {Object.entries(rel._data).map(([key, val]) => (
              <div key={key} className="contents text-[10px]">
                <span className="text-subtle font-medium">{key}</span>
                <span className="text-default truncate">{formatSimple(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

/**
 * Renders a blue-tagged mini table for a to-many relation.
 *
 * Two modes:
 *  - `inline`: items already fetched (forward to-many from Prisma join)
 *  - `remote`: fetched on-demand via tRPC (reverse relations)
 */
function ManyRelationTable({
  label,
  drillDownSlug,
  onPush,
  inline,
  remote,
}: {
  label: string;
  /** Table slug to drill down into when clicking a row */
  drillDownSlug?: string;
  onPush: (entry: StackEntry) => void;
} & (
  | { inline: { items: Record<string, unknown>[]; total: number }; remote?: never }
  | { inline?: never; remote: { sourceSlug: string; fkColumn: string; fkValue: string | number } }
)) {
  const [page, setPage] = useState(1);

  // For remote mode, fetch via tRPC
  const { data: remoteData, isPending } = trpc.viewer.admin.dataview.reverseRelationList.useQuery(
    {
      sourceSlug: remote?.sourceSlug ?? "",
      fkColumn: remote?.fkColumn ?? "",
      fkValue: remote?.fkValue ?? "",
      page,
      pageSize: PAGE_SIZE,
    },
    { enabled: !!remote }
  );

  // Determine rows + total from either source
  const rows = inline ? inline.items : (remoteData?.rows ?? []);
  const total = inline ? inline.total : (remoteData?.total ?? 0);
  const totalPages = inline ? 1 : (remoteData?.totalPages ?? 1);
  const isLoading = !!remote && isPending;

  // Resolve drill-down slug
  const resolvedSlug = drillDownSlug ?? remote?.sourceSlug;
  const targetTable = resolvedSlug ? registry.getBySlug(resolvedSlug) : null;

  // Column detection from first row
  const { scalarKeys, nestedKeys } = useMemo(() => {
    if (rows.length === 0) return { scalarKeys: [], nestedKeys: [] };
    const scalar: string[] = [];
    const nested: string[] = [];
    for (const k of Object.keys(rows[0])) {
      if (k.startsWith("_")) continue;
      const val = rows[0][k];
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        nested.push(k);
      } else {
        scalar.push(k);
      }
    }
    return { scalarKeys: scalar, nestedKeys: nested };
  }, [rows]);

  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-subtle">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <span className="font-medium text-blue-600 dark:text-blue-400">{label}</span>
        {!isLoading && (
          <Badge variant="gray" size="sm">
            {total}
          </Badge>
        )}
      </div>

      {/* Table body */}
      {isLoading ? (
        <div className="border-subtle border-t px-3 py-4 text-center text-xs text-muted">
          <LoaderIcon className="mx-auto h-4 w-4 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="border-subtle border-t px-3 py-3 text-center text-xs text-muted italic">
          No records
        </div>
      ) : (
        <div className="no-scrollbar border-subtle max-h-64 overflow-auto border-t">
          <table className="min-w-full text-[11px]">
            <thead>
              <tr className="bg-subtle/50">
                <th className="w-8 px-1 py-1" />
                {scalarKeys.map((key) => (
                  <th key={key} className="text-subtle px-2 py-1 text-left font-medium">
                    {key}
                  </th>
                ))}
                {nestedKeys.map((key) => (
                  <th key={key} className="px-2 py-1 text-left font-medium text-blue-600 dark:text-blue-400">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item, idx) => {
                const itemId = item.id as string | number | undefined;
                return (
                  <tr key={idx} className="border-subtle hover:bg-subtle/30 border-t transition-colors">
                    {/* Drill-down button */}
                    <td className="px-1 py-1 text-center">
                      {targetTable && resolvedSlug && itemId != null && (
                        <DrillDownLink
                          slug={resolvedSlug}
                          id={itemId}
                          label={`${targetTable.displayName} #${itemId}`}
                          onPush={onPush}>
                          <span className="sr-only">View</span>
                        </DrillDownLink>
                      )}
                    </td>
                    {/* Scalar cells */}
                    {scalarKeys.map((key) => (
                      <td key={key} className="text-default px-2 py-1">
                        {item[key] === null || item[key] === undefined ? (
                          <span className="text-muted italic">null</span>
                        ) : typeof item[key] === "boolean" ? (
                          <Badge variant={item[key] ? "green" : "gray"} size="sm">
                            {String(item[key])}
                          </Badge>
                        ) : (
                          <span className="truncate">{String(item[key])}</span>
                        )}
                      </td>
                    ))}
                    {/* Nested relation cells */}
                    {nestedKeys.map((key) => {
                      const nested = item[key] as Record<string, unknown> | null;
                      if (!nested) return <td key={key} className="text-muted px-2 py-1 italic">null</td>;
                      const display = String(nested.name ?? nested.title ?? nested.email ?? nested.slug ?? nested.id ?? "—");
                      const nestedId = nested.id as string | number | undefined;
                      const slug = guessSlugFromKey(key);
                      const nestedTable = slug ? registry.getBySlug(slug) : null;
                      const isOrg = nested.isOrganization === true;
                      return (
                        <td key={key} className="px-2 py-1">
                          <span className="inline-flex items-center gap-1">
                            {nestedId != null && slug && nestedTable ? (
                              <DrillDownLink slug={slug} id={nestedId} label={`${nestedTable.displayName} #${nestedId}`} onPush={onPush}>
                                {display}
                              </DrillDownLink>
                            ) : (
                              <span className="text-default">{display}</span>
                            )}
                            {isOrg && (
                              <Badge variant="orange" size="sm">org</Badge>
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="border-subtle flex items-center justify-between border-t px-3 py-1.5 text-[10px]">
          <span className="text-muted">{total} total</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-default disabled:text-muted px-1">
              ←
            </button>
            <span className="text-default tabular-nums">
              {page}/{totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-default disabled:text-muted px-1">
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
/** Best-effort slug guess from a Prisma relation key name */
function guessSlugFromKey(key: string): string | null {
  const map: Record<string, string> = {
    user: "users",
    team: "teams",
    owner: "users",
    eventType: "event-types",
    booking: "bookings",
    membership: "memberships",
    organization: "teams",
    parent: "teams",
    teamBilling: "team-billing",
    organizationBilling: "org-billing",
    dunningStatus: "team-dunning",
    reportedBy: "users",
    impersonatedUser: "users",
    impersonatedBy: "users",
    profile: "profiles",
    webhook: "webhooks",
    credential: "credentials",
    payment: "payments",
    workflow: "workflows",
    feature: "features",
    app: "apps",
    schedule: "schedules",
    attendee: "attendees",
    watchlist: "watchlist",
    creditBalance: "credit-balances",
  };
  return map[key] ?? null;
}
function FieldValue({ field, value }: { field: FieldDefinition; value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted italic">null</span>;
  }

  if (field.type === "boolean") {
    return (
      <Badge variant={value ? "green" : "gray"} size="sm">
        {String(value)}
      </Badge>
    );
  }

  if (field.type === "enum") {
    return (
      <Badge variant="blue" size="sm">
        {String(value)}
      </Badge>
    );
  }

  if (field.type === "datetime") {
    const d = new Date(value as string);
    return (
      <span className="text-default font-mono">
        {isNaN(d.getTime())
          ? String(value)
          : d.toLocaleString("en-US", { dateStyle: "long", timeStyle: "medium" })}
      </span>
    );
  }

  if (field.type === "json") {
    return (
      <pre className="bg-subtle text-default max-h-32 overflow-auto rounded p-2 font-mono text-[10px]">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  const str = String(value);

  if (field.type === "url" && str.startsWith("http")) {
    return (
      <a
        href={str}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
        {str}
        <ExternalLinkIcon className="h-2.5 w-2.5" />
      </a>
    );
  }

  if (field.type === "email") {
    return (
      <a href={`mailto:${str}`} className="text-blue-600 hover:underline dark:text-blue-400">
        {str}
      </a>
    );
  }

  return (
    <span className={classNames("text-default break-all", field.isPrimary && "font-mono font-semibold")}>
      {str}
    </span>
  );
}

function formatSimple(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
