"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { autocompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  HighlightStyle,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { searchKeymap } from "@codemirror/search";

import classNames from "@calcom/ui/classNames";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import {
  PlayIcon,
  XIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LockIcon,
  GlobeIcon,
  CodeIcon,
  SlidersHorizontalIcon,
  LinkIcon,
} from "@coss/ui/icons";

import { ResizeHandle } from "./ResizeHandle";
import { SqlQueryBuilder } from "./SqlQueryBuilder";
import { ResultsTable, type SchemaTable } from "./SqlResultsTable";

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── Example queries ─────────────────────────────────────────────────────────

const EXAMPLE_QUERIES: { name: string; sql: string }[] = [
  {
    name: "Active users with bookings this month",
    sql: `SELECT u.id, u.username, u.email, u."created", COUNT(b.id) as booking_count
FROM "users" u
JOIN "Booking" b ON b."userId" = u.id
WHERE b."createdAt" >= date_trunc('month', CURRENT_DATE)
GROUP BY u.id, u.username, u.email, u."created"
ORDER BY booking_count DESC
LIMIT 50`,
  },
  {
    name: "Teams with member counts",
    sql: `SELECT t.id, t.name, t.slug, t."isOrganization",
  COUNT(m.id) as member_count,
  COUNT(CASE WHEN m.accepted THEN 1 END) as accepted_count
FROM "Team" t
LEFT JOIN "Membership" m ON m."teamId" = t.id
GROUP BY t.id, t.name, t.slug, t."isOrganization"
ORDER BY member_count DESC
LIMIT 100`,
  },
  {
    name: "Event types by popularity",
    sql: `SELECT et.id, et.title, et.slug, u.email as owner_email,
  COUNT(b.id) as total_bookings
FROM "EventType" et
LEFT JOIN "users" u ON u.id = et."userId"
LEFT JOIN "Booking" b ON b."eventTypeId" = et.id
GROUP BY et.id, et.title, et.slug, u.email
ORDER BY total_bookings DESC
LIMIT 50`,
  },
  {
    name: "Users without any bookings",
    sql: `SELECT u.id, u.username, u.email, u."created"
FROM "users" u
LEFT JOIN "Booking" b ON b."userId" = u.id
WHERE b.id IS NULL
ORDER BY u."created" DESC
LIMIT 100`,
  },
  {
    name: "Bookings with attendee details",
    sql: `SELECT b.id, b.title, b.status, b."startTime", b."endTime",
  u.email as organizer_email,
  a.email as attendee_email, a.name as attendee_name
FROM "Booking" b
JOIN "users" u ON u.id = b."userId"
JOIN "Attendee" a ON a."bookingId" = b.id
ORDER BY b."startTime" DESC
LIMIT 100`,
  },
];

// SchemaTable type is imported from SqlResultsTable.tsx

// ─── CodeMirror SQL editor ───────────────────────────────────────────────────

const MONO_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

/** Shared base styles for both themes */
const baseEditorStyles = {
  "&": {
    fontSize: "13px",
    height: "100%",
  },
  ".cm-content": {
    fontFamily: MONO_FONT,
    padding: "12px 0",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
  },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  ".cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]": {
    borderRadius: "4px",
  },
};

/** Light theme that inherits cal.com design tokens */
const calLightTheme = EditorView.theme(
  {
    ...baseEditorStyles,
    "&": { ...baseEditorStyles["&"], backgroundColor: "transparent" },
    ".cm-content": {
      ...baseEditorStyles[".cm-content"],
      caretColor: "#1f2328",
    },
    ".cm-gutters": {
      ...baseEditorStyles[".cm-gutters"],
      borderRight: "1px solid #e5e7eb",
      color: "#9ca3af",
    },
    ".cm-activeLineGutter": { backgroundColor: "#f3f4f6" },
    ".cm-activeLine": { backgroundColor: "#f9fafb" },
    "&.cm-focused .cm-cursor": { borderLeftColor: "#1f2328" },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "#b4d5fe",
    },
    ".cm-tooltip.cm-tooltip-autocomplete": {
      ...baseEditorStyles[".cm-tooltip.cm-tooltip-autocomplete"],
      border: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
    },
  },
  { dark: false }
);

/** Dark theme matching Cal.com's dark UI */
const calDarkTheme = EditorView.theme(
  {
    ...baseEditorStyles,
    "&": { ...baseEditorStyles["&"], backgroundColor: "transparent" },
    ".cm-content": {
      ...baseEditorStyles[".cm-content"],
      caretColor: "#e5e7eb",
    },
    ".cm-gutters": {
      ...baseEditorStyles[".cm-gutters"],
      borderRight: "1px solid rgba(255,255,255,0.08)",
      color: "#525252",
    },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,0.04)" },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.03)" },
    "&.cm-focused .cm-cursor": { borderLeftColor: "#e5e7eb" },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(99,102,241,0.3)",
    },
    ".cm-selectionBackground": { backgroundColor: "rgba(99,102,241,0.2)" },
    ".cm-tooltip.cm-tooltip-autocomplete": {
      ...baseEditorStyles[".cm-tooltip.cm-tooltip-autocomplete"],
      border: "1px solid rgba(255,255,255,0.1)",
      backgroundColor: "#1c1c1c",
    },
    ".cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]": {
      ...baseEditorStyles[
        ".cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]"
      ],
      backgroundColor: "rgba(255,255,255,0.08)",
    },
  },
  { dark: true }
);

/** Syntax highlighting for Cal.com dark mode — muted, professional palette */
const calDarkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#c792ea" }, // soft purple for SELECT, FROM, etc.
  {
    tag: [
      tags.name,
      tags.deleted,
      tags.character,
      tags.propertyName,
      tags.macroName,
    ],
    color: "#d4d4d4",
  },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#82aaff" },
  {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: "#f78c6c",
  },
  { tag: [tags.definition(tags.name), tags.separator], color: "#d4d4d4" },
  {
    tag: [
      tags.typeName,
      tags.className,
      tags.number,
      tags.changed,
      tags.annotation,
      tags.modifier,
      tags.self,
      tags.namespace,
    ],
    color: "#ffcb6b",
  },
  {
    tag: [
      tags.operator,
      tags.operatorKeyword,
      tags.url,
      tags.escape,
      tags.regexp,
      tags.link,
      tags.special(tags.string),
    ],
    color: "#89ddff",
  },
  { tag: [tags.meta, tags.comment], color: "#546e7a", fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "#82aaff", textDecoration: "underline" },
  { tag: tags.heading, fontWeight: "bold", color: "#c792ea" },
  {
    tag: [tags.atom, tags.bool, tags.special(tags.variableName)],
    color: "#f78c6c",
  },
  {
    tag: [tags.processingInstruction, tags.string, tags.inserted],
    color: "#c3e88d",
  },
  { tag: tags.invalid, color: "#ff5370" },
]);

interface SqlEditorProps {
  value: string;
  onChange: (sql: string) => void;
  onExecute: () => void;
  isDark: boolean;
  schema?: SchemaTable[];
  insertRef: React.MutableRefObject<((text: string) => void) | null>;
}

function SqlEditor({
  value,
  onChange,
  onExecute,
  isDark,
  schema,
  insertRef,
}: SqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const schemaCompartment = useRef(new Compartment());
  // Stable refs for callbacks used inside CodeMirror (created once)
  const onExecuteRef = useRef(onExecute);
  const onChangeRef = useRef(onChange);
  onExecuteRef.current = onExecute;
  onChangeRef.current = onChange;

  // Build CodeMirror-compatible schema for autocomplete from registry.
  // Register both quoted and unquoted names so completions fire either way.
  const cmSchema = useMemo(() => {
    if (!schema?.length) return undefined;
    const tables: Record<string, string[]> = {};
    for (const t of schema) {
      const cols = t.columns.map((c) => c.column);
      // Unquoted (CM matches these in completions)
      tables[t.modelName] = cols;
      // Also register the actual PG table name if different
      if (t.tableName && t.tableName !== t.modelName) {
        tables[t.tableName] = cols;
      }
    }
    return tables;
  }, [schema]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!containerRef.current) return;

    const sqlLang = sql({
      dialect: PostgreSQL,
      upperCaseKeywords: true,
      schema: cmSchema,
    });

    const runQueryKeymap = keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onExecuteRef.current();
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        runQueryKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        history(),
        schemaCompartment.current.of(sqlLang),
        autocompletion(),
        themeCompartment.current.of(
          isDark
            ? [calDarkTheme, syntaxHighlighting(calDarkHighlightStyle)]
            : [
                calLightTheme,
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
              ]
        ),
        cmPlaceholder("SELECT * FROM ..."),
        EditorView.lineWrapping,
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only re-create on mount — theme/schema/value updates handled via compartments/dispatch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync theme changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.current.reconfigure(
        isDark
          ? [calDarkTheme, syntaxHighlighting(calDarkHighlightStyle)]
          : [
              calLightTheme,
              syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            ]
      ),
    });
  }, [isDark]);

  // Sync schema changes for autocomplete
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: schemaCompartment.current.reconfigure(
        sql({ dialect: PostgreSQL, upperCaseKeywords: true, schema: cmSchema })
      ),
    });
  }, [cmSchema]);

  // Sync external value changes (e.g. loading a saved query).
  // Compare against CM's current doc to avoid re-dispatching CM's own changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // Expose insert-at-cursor for the schema sidebar
  useEffect(() => {
    insertRef.current = (text: string) => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
      view.focus();
    };
  }, [insertRef]);

  return <div ref={containerRef} className="h-full w-full overflow-auto" />;
}

// ─── Schema sidebar ──────────────────────────────────────────────────────────

function SchemaSidebar({
  tables,
  isLoading,
  onInsert,
}: {
  tables: SchemaTable[];
  isLoading: boolean;
  onInsert: (text: string) => void;
}) {
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return tables;
    const q = search.toLowerCase();
    return tables.filter(
      (t) =>
        t.modelName.toLowerCase().includes(q) ||
        t.columns.some((c) => c.column.toLowerCase().includes(q))
    );
  }, [tables, search]);

  return (
    <div
      className="border-subtle flex h-full flex-col border-r"
      style={{ width: 220 }}
    >
      <div className="border-subtle border-b px-3 py-2">
        <span className="text-emphasis text-xs font-semibold">Schema</span>
        <input
          type="text"
          placeholder="Filter tables…"
          className="border-subtle bg-default text-default placeholder:text-muted mt-1.5 h-7 w-full rounded border px-2 text-xs outline-none focus:border-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-muted p-3 text-xs">Loading schema…</div>
        ) : (
          filtered.map((table) => {
            const isExpanded = expandedTable === table.modelName;
            return (
              <div key={table.modelName}>
                <button
                  className="hover:bg-subtle flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors"
                  onClick={() =>
                    setExpandedTable(isExpanded ? null : table.modelName)
                  }
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="text-muted h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRightIcon className="text-muted h-3 w-3 shrink-0" />
                  )}
                  <span className="text-emphasis font-medium">
                    {table.modelName}
                  </span>
                </button>
                {isExpanded && (
                  <div className="pb-1">
                    <button
                      className="text-blue-500 hover:text-blue-600 w-full px-8 py-0.5 text-left text-[10px]"
                      onClick={() => onInsert(`"${table.modelName}"`)}
                    >
                      ⊕ Insert table name
                    </button>
                    {table.columns.map((col) => (
                      <button
                        key={col.column}
                        className="hover:bg-subtle flex w-full items-center gap-2 px-8 py-0.5 text-left text-[11px] transition-colors"
                        onClick={() => onInsert(`"${col.column}"`)}
                        title={`${col.label} (${col.type})${
                          col.enumValues
                            ? `\nValues: ${col.enumValues.join(", ")}`
                            : ""
                        }`}
                      >
                        <span className="text-default">{col.column}</span>
                        <span className="text-muted text-[9px]">
                          {col.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ResultsTable and CellValue are imported from SqlResultsTable.tsx

// ─── Saved queries panel ─────────────────────────────────────────────────────

function SavedQueriesDropdown({
  onLoad,
  currentSql,
}: {
  onLoad: (sql: string, queryId?: string) => void;
  currentSql: string;
}) {
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveVisibility, setSaveVisibility] = useState<"public" | "private">(
    "private"
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: savedData, isLoading } =
    trpc.viewer.admin.dataview.savedQueries.useQuery(undefined, {
      enabled: open, // Only fetch when dropdown is open
    });
  const saveMutation = trpc.viewer.admin.dataview.saveQuery.useMutation({
    onSuccess: () => {
      utils.viewer.admin.dataview.savedQueries.invalidate();
      setSaveName("");
    },
  });
  const deleteMutation =
    trpc.viewer.admin.dataview.deleteSavedQuery.useMutation({
      onSuccess: () => utils.viewer.admin.dataview.savedQueries.invalidate(),
    });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSave = () => {
    if (!saveName.trim() || !currentSql.trim()) return;
    saveMutation.mutate({
      name: saveName.trim(),
      sql: currentSql,
      visibility: saveVisibility,
    });
  };

  const publicQueries = savedData?.public ?? [];
  const privateQueries = savedData?.private ?? [];
  const hasAny = publicQueries.length > 0 || privateQueries.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-subtle hover:text-default flex items-center gap-1 text-xs"
      >
        Saved Queries
        <ChevronDownIcon className="h-3 w-3" />
      </button>
      {open && (
        <div className="border-subtle bg-default absolute right-0 top-full z-50 mt-1 w-96 rounded-md border shadow-lg">
          {/* Save current */}
          <div className="border-subtle border-b p-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Save current query as…"
                className="border-subtle bg-default text-default placeholder:text-muted h-7 flex-1 rounded border px-2 text-xs outline-none focus:border-blue-500"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <button
                onClick={() =>
                  setSaveVisibility(
                    saveVisibility === "private" ? "public" : "private"
                  )
                }
                className={classNames(
                  "border-subtle flex h-7 items-center gap-1 rounded border px-2 text-[11px] font-medium transition-colors",
                  saveVisibility === "private"
                    ? "text-subtle hover:bg-subtle"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                )}
                title={
                  saveVisibility === "private"
                    ? "Private — only you"
                    : "Public — all admins"
                }
              >
                {saveVisibility === "private" ? (
                  <>
                    <LockIcon className="h-3 w-3" /> Private
                  </>
                ) : (
                  <>
                    <GlobeIcon className="h-3 w-3" /> Public
                  </>
                )}
              </button>
              <Button
                onClick={handleSave}
                disabled={
                  !saveName.trim() ||
                  !currentSql.trim() ||
                  saveMutation.isPending
                }
                size="sm"
                loading={saveMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Examples */}
          <div className="border-subtle border-b">
            <div className="text-muted px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider">
              Examples
            </div>
            {EXAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                className="hover:bg-subtle w-full px-3 py-1.5 text-left text-xs transition-colors"
                onClick={() => {
                  onLoad(q.sql);
                  setOpen(false);
                }}
              >
                <span className="text-emphasis">{q.name}</span>
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading && (
              <div className="text-muted p-3 text-center text-xs">Loading…</div>
            )}

            {/* Public queries */}
            {publicQueries.length > 0 && (
              <div className="border-subtle border-b">
                <div className="text-muted flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider">
                  <GlobeIcon className="h-3 w-3" /> Shared
                </div>
                {publicQueries.map((q) => (
                  <SavedQueryRow
                    key={q.id}
                    query={q}
                    onLoad={(querySql, queryId) => {
                      onLoad(querySql, queryId);
                      setOpen(false);
                    }}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                  />
                ))}
              </div>
            )}

            {/* Private queries */}
            {privateQueries.length > 0 && (
              <div>
                <div className="text-muted flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider">
                  <LockIcon className="h-3 w-3" /> My Queries
                </div>
                {privateQueries.map((q) => (
                  <SavedQueryRow
                    key={q.id}
                    query={q}
                    onLoad={(querySql, queryId) => {
                      onLoad(querySql, queryId);
                      setOpen(false);
                    }}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                  />
                ))}
              </div>
            )}

            {!isLoading && !hasAny && (
              <div className="text-muted p-3 text-center text-xs">
                No saved queries yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyLinkButton({ queryId }: { queryId: string }) {
  const { isCopied, copyToClipboard } = useCopy();
  return (
    <button
      onClick={() =>
        copyToClipboard(`${window.location.origin}/admin/data/sql?q=${queryId}`)
      }
      className="text-muted hover:text-default ml-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      title={isCopied ? "Copied!" : "Copy link"}
    >
      {isCopied ? (
        <span className="text-[9px]">✓</span>
      ) : (
        <LinkIcon className="h-3 w-3" />
      )}
    </button>
  );
}

function SavedQueryRow({
  query,
  onLoad,
  onDelete,
}: {
  query: { id: string; name: string; sql: string; createdByEmail: string };
  onLoad: (sql: string, queryId?: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="hover:bg-subtle group flex items-center justify-between px-3 py-1.5 transition-colors">
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onLoad(query.sql, query.id)}
      >
        <span className="text-emphasis block truncate text-xs">
          {query.name}
        </span>
        <span className="text-muted block truncate text-[10px]">
          {query.createdByEmail}
        </span>
      </button>
      <CopyLinkButton queryId={query.id} />
      <button
        onClick={() => onDelete(query.id)}
        className="text-muted hover:text-error ml-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        title="Delete"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Panel mode toggle ───────────────────────────────────────────────────────

type PanelMode = "editor" | "builder";

function PanelModeToggle({
  mode,
  onChange,
}: {
  mode: PanelMode;
  onChange: (mode: PanelMode) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded border">
      {(["editor", "builder"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={classNames(
            "flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors",
            mode === m
              ? "bg-emphasis text-inverted"
              : "bg-default text-subtle hover:bg-subtle"
          )}
        >
          {m === "editor" ? (
            <CodeIcon className="h-3 w-3" />
          ) : (
            <SlidersHorizontalIcon className="h-3 w-3" />
          )}
          {m === "editor" ? "SQL Editor" : "Query Builder"}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SqlQueryPanel() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryIdFromUrl = searchParams?.get("q") ?? null;
  const [sql, setSql] = useState(EXAMPLE_QUERIES[0].sql);
  const [activeQueryId, setActiveQueryId] = useState<string | null>(
    queryIdFromUrl
  );
  const [panelMode, setPanelMode] = useState<PanelMode>("editor");
  const [builderSql, setBuilderSql] = useState("");
  const [builderHasAggregation, setBuilderHasAggregation] = useState(false);
  const insertRef = useRef<((text: string) => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState<number | null>(null);

  const { data: schema, isLoading: schemaLoading } =
    trpc.viewer.admin.dataview.sqlSchema.useQuery();
  const sqlMutation = trpc.viewer.admin.dataview.sqlQuery.useMutation();

  // Load saved query from URL param on mount
  const { data: linkedQuery } =
    trpc.viewer.admin.dataview.savedQueryById.useQuery(
      { id: queryIdFromUrl! },
      { enabled: !!queryIdFromUrl }
    );
  const [linkedQueryApplied, setLinkedQueryApplied] = useState<string | null>(null);
  useEffect(() => {
    if (linkedQuery && linkedQueryApplied !== linkedQuery.id) {
      setSql(linkedQuery.sql);
      setActiveQueryId(linkedQuery.id);
      setLinkedQueryApplied(linkedQuery.id);
    }
  }, [linkedQuery, linkedQueryApplied]);

  /** Load a saved query and push its ID to the URL */
  const handleLoadSavedQuery = useCallback(
    (querySql: string, queryId?: string) => {
      setSql(querySql);
      if (queryId) {
        setActiveQueryId(queryId);
        router.replace(`/admin/data/sql?q=${queryId}`, { scroll: false });
      } else {
        setActiveQueryId(null);
        router.replace("/admin/data/sql", { scroll: false });
      }
    },
    [router]
  );

  // In builder mode, only show the results pane when there's something to show
  const builderHasResults =
    panelMode === "builder" &&
    (sqlMutation.isPending || !!sqlMutation.data || !!sqlMutation.error);

  const handleExecute = useCallback(() => {
    if (!sql.trim()) return;
    sqlMutation.mutate({ sql: sql.trim() });
  }, [sql, sqlMutation]);

  const handleInsertText = useCallback((text: string) => {
    insertRef.current?.(text);
  }, []);

  // Default to 50% on mount
  useEffect(() => {
    if (containerRef.current && editorHeight === null) {
      setEditorHeight(Math.round(containerRef.current.clientHeight / 2));
    }
  }, [editorHeight]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && editorHeight !== null) {
        const total = containerRef.current.clientHeight;
        // Clamp editor height to valid range
        setEditorHeight((h) =>
          Math.min(Math.max(h ?? total / 2, 100), total - 100)
        );
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [editorHeight]);

  const handleVerticalResize = useCallback((delta: number) => {
    if (!containerRef.current) return;
    const total = containerRef.current.clientHeight;
    setEditorHeight((h) =>
      Math.min(Math.max((h ?? total / 2) + delta, 100), total - 100)
    );
  }, []);

  const handleOpenInEditor = useCallback((generatedSql: string) => {
    setSql(generatedSql);
    setPanelMode("editor");
  }, []);

  const handleBuilderExecute = useCallback(
    (generatedSql: string) => {
      if (!generatedSql.trim()) return;
      sqlMutation.mutate({ sql: generatedSql.trim() });
    },
    [sqlMutation]
  );

  const handleBuilderSqlChange = useCallback((generatedSql: string) => {
    setBuilderSql(generatedSql);
  }, []);

  const handleBuilderAggregationChange = useCallback((hasAgg: boolean) => {
    setBuilderHasAggregation(hasAgg);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Schema sidebar — only in editor mode */}
      {panelMode === "editor" && (
        <SchemaSidebar
          tables={schema ?? []}
          isLoading={schemaLoading}
          onInsert={handleInsertText}
        />
      )}

      {/* Main content — vertical split */}
      <div ref={containerRef} className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top bar with mode toggle ── */}
        <div className="border-subtle bg-default flex shrink-0 items-center justify-between border-b px-3 py-1.5">
          <div className="flex items-center gap-3">
            <PanelModeToggle mode={panelMode} onChange={setPanelMode} />
            <span className="text-muted text-[11px]">
              Read-only · SELECT only · Max 1000 rows
            </span>
          </div>
          <div className="flex items-center gap-3">
            {panelMode === "editor" && (
              <>
                <SavedQueriesDropdown
                  onLoad={handleLoadSavedQuery}
                  currentSql={sql}
                />
                <Button
                  onClick={handleExecute}
                  loading={sqlMutation.isPending}
                  disabled={!sql.trim()}
                  size="sm"
                >
                  <PlayIcon className="h-3 w-3" />
                  {sqlMutation.isPending ? "Running…" : "Run Query"}
                  <kbd className="bg-white/16 ml-1 rounded px-1 py-0.5 text-[9px]">
                    ⌘↵
                  </kbd>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Editor pane (SQL Editor mode) ── */}
        {panelMode === "editor" && (
          <div
            className="flex flex-col overflow-hidden"
            style={{ height: editorHeight ?? "50%" }}
          >
            {/* SQL editor with CodeMirror */}
            <div className="flex-1 overflow-hidden">
              <SqlEditor
                value={sql}
                onChange={setSql}
                onExecute={handleExecute}
                isDark={isDark}
                schema={schema}
                insertRef={insertRef}
              />
            </div>
          </div>
        )}

        {/* ── Builder pane (Query Builder mode) ── */}
        {panelMode === "builder" && (
          <div
            className="flex flex-col overflow-hidden"
            style={{
              height: builderHasResults ? editorHeight ?? "50%" : undefined,
              flex: builderHasResults ? undefined : "1 1 0%",
            }}
          >
            <SqlQueryBuilder
              schema={schema ?? []}
              onExecute={handleBuilderExecute}
              sqlMutation={sqlMutation}
              onSqlChange={handleBuilderSqlChange}
              onAggregationChange={handleBuilderAggregationChange}
              onOpenInEditor={() => handleOpenInEditor(builderSql)}
            />
          </div>
        )}

        {/* ── Resize handle + Results pane ── */}
        {/* In builder mode, only show when there are results */}
        {(panelMode === "editor" || builderHasResults) && (
          <>
            <ResizeHandle direction="down" onResize={handleVerticalResize} />

            <div className="flex flex-1 flex-col overflow-hidden">
              {sqlMutation.isPending && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    <p className="text-muted text-sm">Executing query…</p>
                  </div>
                </div>
              )}

              {sqlMutation.error && !sqlMutation.isPending && (
                <div className="flex-1 overflow-auto p-4">
                  <div className="bg-error/10 border-error/20 rounded-md border p-4">
                    <p className="text-error text-sm font-medium">
                      Query Error
                    </p>
                    <pre className="text-error/80 mt-2 whitespace-pre-wrap font-mono text-xs">
                      {sqlMutation.error.message}
                    </pre>
                  </div>
                </div>
              )}

              {sqlMutation.data && !sqlMutation.isPending && (
                <ResultsTable
                  columns={sqlMutation.data.columns}
                  rows={sqlMutation.data.rows}
                  rowCount={sqlMutation.data.rowCount}
                  truncated={sqlMutation.data.truncated}
                  executionTimeMs={sqlMutation.data.executionTimeMs}
                  hasAggregation={
                    panelMode === "builder" ? builderHasAggregation : undefined
                  }
                />
              )}

              {!sqlMutation.data &&
                !sqlMutation.isPending &&
                !sqlMutation.error &&
                panelMode === "editor" && (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                      <p className="text-muted text-sm">
                        Write a SQL query and press{" "}
                        <kbd className="bg-subtle text-default rounded border px-1.5 py-0.5 text-xs">
                          ⌘ Enter
                        </kbd>{" "}
                        to execute
                      </p>
                      <p className="text-muted mt-1 text-xs">
                        Click table/column names in the sidebar to insert them
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
