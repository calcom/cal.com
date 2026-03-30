/**
 * Admin DataView — Type definitions for the table registry.
 *
 * Every Prisma model that should be browseable in the admin area is
 * registered here with its field‐level access rules.
 */

/** Scalar types we understand how to render / validate */
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "datetime"
  | "json"
  | "enum"
  | "email"
  | "url";

/** Access level for a single field */
export type FieldAccess =
  /** Visible and editable by admin (reserved for future use) */
  | "editable"
  /** Visible but cannot be changed through this UI */
  | "readonly"
  /** Never fetched from DB, completely invisible in the UI */
  | "hidden";

export interface FieldDefinition {
  /** Column name in the Prisma model */
  column: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** The data type for rendering & validation */
  type: FieldType;
  /** Access level — defaults to "readonly" if omitted */
  access?: FieldAccess;
  /** For enum fields: the allowed values */
  enumValues?: string[];
  /** Whether this field is the primary key (exactly one per table) */
  isPrimary?: boolean;
  /** Brief description shown as tooltip in the UI */
  description?: string;
  /** Whether this column is searchable via the global search box */
  searchable?: boolean;
  /** Whether to show this column in the list/table view (defaults true) */
  showInList?: boolean;
  /**
   * If set, this field is a relation join.
   * `column` becomes the Prisma relation name (e.g. "user", "team").
   * The nested `select` fields and display template are defined here.
   */
  relation?: RelationDefinition;
}

/**
 * Describes how to join and display a Prisma relation.
 *
 * Example — show team name on a Membership row:
 * ```
 * {
 *   modelName: "Team",
 *   select: { id: true, name: true, slug: true },
 *   displayField: "name",
 *   linkTo: { slug: "teams", paramField: "id" },
 * }
 * ```
 */
export interface RelationDefinition {
  /** The target Prisma model name */
  modelName: string;
  /** Fields to select from the related model — keep this minimal. Supports nested selects for sub-relations. */
  select: Record<string, true | { select: Record<string, true | { select: Record<string, true> }> }>;
  /**
   * Which field from the related model to display in the cell.
   * Can be a single field name or a template like "{name} ({email})".
   */
  displayField: string;
  /**
   * Optional: make the cell a link to the related record in the studio.
   * `slug` is the target table slug, `paramField` is the PK field name.
   */
  linkTo?: { slug: string; paramField: string };
  /**
   * The FK column on this model that backs this relation.
   * Usually inferred as `${relationName}Id`, but can be overridden for
   * cases like `owner` → `userId` where the convention doesn't hold.
   */
  fkColumn?: string;
  /** For to-many relations: limit how many related records to fetch */
  take?: number;
  /** Whether this is a to-many relation (renders as count + expandable) */
  many?: boolean;
}

export interface TableDefinition {
  /** Internal key — must match the Prisma model name (PascalCase) */
  modelName: string;
  /** Human-readable name shown in the sidebar */
  displayName: string;
  /** Plural form for headers / breadcrumbs */
  displayNamePlural: string;
  /** Short description of what this table holds */
  description: string;
  /** URL-safe slug used in routes: /admin/data/{slug} */
  slug: string;
  /** Grouping category for the sidebar */
  category: "core" | "billing" | "platform" | "abuse" | "system";
  /** Ordered list of field definitions */
  fields: FieldDefinition[];
  /** Default sort column */
  defaultSort?: string;
  /** Default sort direction */
  defaultSortDirection?: "asc" | "desc";
  /** Maximum rows per page (default 50) */
  pageSize?: number;
  /** Actions that can be performed on records in this table */
  actions?: ActionDefinition[];
  /** Custom panels shown in the detail view (e.g. billing, audit log) */
  panels?: PanelDefinition[];
}

/**
 * A custom panel rendered in the record detail view.
 * The `id` maps to a registered panel component on the frontend.
 */
export interface PanelDefinition {
  /** Must match a registered panel component (e.g. "billing") */
  id: string;
  /** Label shown as the panel header */
  label: string;
  /** Only show this panel when condition returns true */
  condition?: (row: Record<string, unknown>) => boolean;
}

/**
 * An action that can be performed on a record from the admin UI.
 * Maps to existing tRPC admin mutations.
 */
export interface ActionDefinition {
  /** Unique identifier */
  id: string;
  /** Label shown in the menu / button */
  label: string;
  /** Icon name from coss/ui icons */
  icon?: string;
  /** Visual variant */
  variant: "default" | "destructive";
  /**
   * The tRPC mutation path relative to `trpc.viewer`.
   * e.g. "admin.lockUserAccount" or "users.delete"
   */
  mutation: string;
  /** Build the mutation input from the current row data */
  buildInput: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Only show this action when condition returns true */
  condition?: (row: Record<string, unknown>) => boolean;
  /** If set, shows a confirmation dialog before executing */
  confirm?: {
    title: string;
    description: string;
    confirmLabel?: string;
  };
  /**
   * If set, this action opens a custom form component instead of
   * calling a mutation directly. The `formId` maps to a registered
   * form component on the frontend.
   */
  formId?: string;
}

/** The full registry is just a readonly array of table definitions */
export type TableRegistry = readonly TableDefinition[];

/**
 * A computed reverse relation — "this table references you via this FK".
 * Not stored in the registry, computed at runtime from forward relations.
 */
export interface ReverseRelation {
  /** The table that references us */
  sourceTable: TableDefinition;
  /** The FK column on the source table (e.g. "userId") */
  sourceField: FieldDefinition;
  /** The relation field on the source table that points to us */
  sourceRelationField: FieldDefinition;
  /** Human label for display, e.g. "Bookings (as user)" */
  label: string;
}
