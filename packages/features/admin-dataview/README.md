# Admin Data Studio

A declarative, registry-driven admin data explorer for browsing and acting on database models in the Cal.com admin area. Accessed at `/admin/data/[slug]`.

## Architecture

```
packages/features/admin-dataview/    ← Shared: types, registry, service, tRPC router
apps/web/modules/admin-dataview/     ← Frontend: UI components, panels, action forms
```

### Core Concepts

| Concept | What it does |
|---------|-------------|
| **TableDefinition** | Declarative schema for a database model — fields, access rules, relations, actions, panels |
| **AdminTable** | Wrapper class with computed accessors and query builders |
| **AdminTableRegistry** | Central registry with O(1) lookup by slug/model + reverse relation computation |
| **AdminDataViewService** | Server-side service that executes database queries from table definitions |
| **Panels** | Custom detail-view widgets (e.g. billing info) registered on the frontend |
| **Actions** | Row-level operations (lock user, delete, transfer) backed by tRPC mutations |
| **Action Forms** | Multi-step forms for complex actions (e.g. transfer ownership with preview) |

### Data Flow

```
TableDefinition (tables/user.ts)
  → AdminTableRegistry (registry.ts)
    → AdminDataViewService (server/service.ts)  ← builds select/where/orderBy queries
      → tRPC router (server/trpc-router.ts)     ← authedAdminProcedure
        → Frontend StudioTable/RecordDetailModal
```

---

## Adding a New Table

### 1. Create the table definition

Create a file in `packages/features/admin-dataview/tables/my-model.ts`:

```typescript
import type { TableDefinition } from "../types";
import { id, timestamps } from "./_helpers";

export const myModelTable: TableDefinition = {
  // Must match the database model name (PascalCase)
  modelName: "MyModel",
  displayName: "My Model",
  displayNamePlural: "My Models",
  description: "Description shown in the sidebar",
  // URL-safe slug → /admin/data/my-models
  slug: "my-models",
  // Groups in sidebar: "core" | "billing" | "platform" | "abuse" | "system"
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  pageSize: 50,  // default is 50
  fields: [
    id(),  // helper: { column: "id", type: "number", isPrimary: true, ... }
    // ... your fields
    ...timestamps(),  // helper: createdAt + updatedAt
  ],
};
```

### 2. Register it

Add to `packages/features/admin-dataview/registry.ts`:

```typescript
import { myModelTable } from "./tables/my-model";

const ALL_TABLES: TableRegistry = [
  // ... existing tables
  myModelTable,
] as const;
```

That's it — the table will appear in the sidebar and be browseable.

---

## Field Definitions

Every field in the `fields` array describes a column:

```typescript
{
  column: "email",           // Database column name
  label: "Email",            // UI label
  type: "email",             // Rendering type (see below)
  access: "editable",        // Access level (see below)
  searchable: true,          // Include in global search
  showInList: true,          // Show in table view (default: true)
  isPrimary: true,           // Mark as PK (exactly one per table)
  description: "Tooltip",    // Tooltip text
  enumValues: ["A", "B"],    // For type: "enum" only
}
```

### Field Types

| Type | Renders as |
|------|-----------|
| `string` | Plain text |
| `number` | Numeric |
| `boolean` | Green/gray badge |
| `datetime` | Formatted date/time |
| `json` | Monospace pre block |
| `enum` | Blue badge, filterable by `enumValues` |
| `email` | `mailto:` link |
| `url` | External link |

### Access Levels

| Access | Behavior |
|--------|----------|
| `"readonly"` | Visible in list + detail views (default if omitted) |
| `"editable"` | Visible, marked as editable (future inline editing) |
| `"hidden"` | Never fetched from DB, completely invisible |

### Hiding Sensitive Data

Set `access: "hidden"` to prevent a field from ever being fetched or displayed:

```typescript
{ column: "password",       label: "Password",     type: "string", access: "hidden" },
{ column: "twoFactorSecret", label: "2FA Secret",  type: "string", access: "hidden" },
{ column: "metadata",       label: "Metadata",     type: "json",   access: "hidden" },
```

Hidden fields are excluded from the query `select` — they never leave the database.

### Controlling List vs Detail Visibility

Use `showInList: false` to hide a field from the table view while still showing it in the detail modal:

```typescript
{ column: "bio", label: "Bio", type: "string", showInList: false },
```

---

## Relations

Relations are defined inline on a field using the `relation` property.

### To-One Relations

Link to a single related record with drill-down navigation:

```typescript
{
  column: "user",              // Relation name on the model
  label: "Booked By",
  type: "string",
  access: "readonly",
  relation: {
    modelName: "User",
    select: { id: true, name: true, email: true },  // Keep minimal!
    displayField: "name",       // Which field to show in the cell
    linkTo: {
      slug: "users",            // Target table slug for drill-down
      paramField: "id",         // PK field on the target
    },
  },
}
```

If the FK column doesn't follow the `${relationName}Id` convention, set `fkColumn`:

```typescript
relation: {
  modelName: "User",
  select: { id: true, name: true },
  displayField: "name",
  fkColumn: "ownerId",  // instead of default "userId"
  linkTo: { slug: "users", paramField: "id" },
}
```

### To-Many Relations (Count + Preview)

Show a count badge with expandable preview items:

```typescript
{
  column: "members",
  label: "Members",
  type: "number",
  access: "readonly",
  relation: {
    modelName: "Membership",
    select: {
      id: true,
      userId: true,
      role: true,
      // Nested sub-relations are supported
      user: { select: { id: true, name: true, email: true } },
    },
    displayField: "_count",   // Special: shows count badge
    many: true,
    take: 20,                  // Limit preview items
  },
}
```

### Reverse Relations

Reverse relations (e.g. "show all Bookings for this User") are **computed automatically** from forward relations. If table A has a to-one relation pointing to table B, the detail view for B will show "A records (as fieldName)" with lazy-loaded pagination.

No extra configuration needed — they're deduplicated against forward to-many relations.

---

## Actions

Actions are row-level operations shown in the context menu (right-click) and detail view dropdown.

### Simple Action (Direct Mutation)

```typescript
actions: [
  {
    id: "lock",                           // Unique ID
    label: "Lock Account",
    icon: "lock",                         // coss icon name
    variant: "destructive",               // "default" | "destructive"
    mutation: "admin.lockUserAccount",     // tRPC path relative to viewer.*
    buildInput: (row) => ({               // Build mutation input from row data
      userId: row.id,
      locked: true,
    }),
    condition: (row) => !row.locked,      // Only show when unlocked
    confirm: {                            // Optional confirmation dialog
      title: "Lock {{name}}?",            // {{field}} interpolation
      description: "{{email}} will be unable to log in.",
      confirmLabel: "Lock",
    },
  },
],
```

### Conditional Actions

Use `condition` to show/hide actions based on row state:

```typescript
{
  id: "unlock",
  label: "Unlock Account",
  variant: "default",
  mutation: "admin.lockUserAccount",
  buildInput: (row) => ({ userId: row.id, locked: false }),
  condition: (row) => row.locked === true,  // Only show when locked
}
```

### Actions with Custom Forms

For complex multi-step actions, use `formId` to open a custom form component:

```typescript
{
  id: "transfer-ownership",
  label: "Transfer Ownership",
  variant: "default",
  mutation: "admin.transferOwnership",  // not called directly
  buildInput: (row) => ({ teamId: row.id }),
  formId: "transfer-ownership",         // maps to ACTION_FORM_COMPONENTS
}
```

Register the form component in `apps/web/modules/admin-dataview/components/action-forms/ActionFormRegistry.tsx`:

```typescript
import { TransferOwnershipActionForm } from "./TransferOwnershipActionForm";

export const ACTION_FORM_COMPONENTS: Record<string, React.ComponentType<ActionFormProps>> = {
  "transfer-ownership": TransferOwnershipActionForm,
};
```

The form component receives `ActionFormProps`:

```typescript
interface ActionFormProps {
  table: AdminTable;
  row: Record<string, unknown>;
  onComplete: () => void;   // Call after successful action
  onCancel: () => void;     // Call to close form
}
```

### Mutation Path Resolution

The `mutation` string maps to tRPC endpoints:

| `mutation` value | HTTP endpoint |
|-----------------|---------------|
| `"admin.lockUserAccount"` | `POST /api/trpc/admin/lockUserAccount` |
| `"users.delete"` | `POST /api/trpc/users/delete` |
| `"admin.watchlist.delete"` | `POST /api/trpc/admin/watchlist.delete` |
| `"organizations.adminVerify"` | `POST /api/trpc/organizations/adminVerify` |

First segment = endpoint, rest = procedure path.

### Confirmation Dialog Interpolation

Use `{{fieldName}}` in confirm strings to inject row values:

```typescript
confirm: {
  title: "Delete {{name}}?",
  description: "This will permanently delete {{email}} (ID: {{id}}).",
  confirmLabel: "Delete forever",
}
```

---

## Panels

Panels are custom widgets rendered in the record detail view, below the field list.

### 1. Define the panel on the table

```typescript
panels: [
  {
    id: "billing",                        // Must match a registered component
    label: "Billing & Subscription",
    condition: (row) => row.isOrganization === true,  // Optional
  },
],
```

### 2. Register the panel component

In `apps/web/modules/admin-dataview/components/panels/PanelRenderer.tsx`:

```typescript
const PANEL_COMPONENTS: Record<string, {
  Component: React.ComponentType<{ data: any; row: Record<string, unknown> }>;
  useData: (row: Record<string, unknown>) => { data: any; isPending: boolean };
}> = {
  billing: {
    Component: ({ data }) => <BillingPanel data={data} />,
    useData: (row) => {
      const teamId = row.id as number;
      const { data, isPending } = trpc.viewer.admin.dataview.billingByTeamId.useQuery(
        { teamId },
        { enabled: !!teamId }
      );
      return { data, isPending };
    },
  },
};
```

Each panel has:
- **`Component`** — React component that renders the panel content
- **`useData`** — Hook that fetches data (can call any tRPC query)

If the panel needs a custom tRPC endpoint, add it to `server/trpc-router.ts`.

---

## Helper Functions

`tables/_helpers.ts` provides reusable field builders:

```typescript
import { id, uuid, timestamps } from "./_helpers";

fields: [
  id(),                    // { column: "id", type: "number", isPrimary: true, ... }
  id({ type: "string" }),  // Override for string PKs (e.g. UUIDs)
  uuid(),                  // { column: "uuid", type: "string", showInList: false }
  uuid("customUuidCol"),   // Custom column name
  ...timestamps(),         // [createdAt, updatedAt] fields
]
```

---

## Categories

Tables are grouped in the sidebar by category:

| Category | Use for |
|----------|---------|
| `"core"` | Primary entities: Users, Teams, Bookings, Event Types |
| `"billing"` | Billing, subscriptions, payments, credits |
| `"platform"` | Apps, webhooks, workflows |
| `"abuse"` | Watchlist, reports, abuse scores |
| `"system"` | Features, settings, impersonation logs |

---

## Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `StudioLayout` | `modules/admin-dataview/components/` | Main 3-panel layout (sidebar + table + optional pinned detail) |
| `StudioSidebar` | `modules/admin-dataview/components/` | Table list grouped by category |
| `StudioTable` | `modules/admin-dataview/components/` | Data grid with sorting, filtering, search, pagination |
| `RecordDetailModal` | `modules/admin-dataview/components/` | Record detail view (dialog or pinned panel mode) with breadcrumb navigation |
| `RowActions` | `modules/admin-dataview/components/` | Context menu + action dropdown with confirmation dialogs |
| `DataCell` | `modules/admin-dataview/components/` | Type-aware cell renderer |
| `ColumnFilter` | `modules/admin-dataview/components/` | Per-column filter UI |
| `PanelRenderer` | `modules/admin-dataview/components/panels/` | Panel component dispatcher |
| `ActionFormRegistry` | `modules/admin-dataview/components/action-forms/` | Action form component registry |
| `StudioContext` | `modules/admin-dataview/contexts/` | Detail view state management (open/close/pin/unpin) |

---

## Quick Reference: Adding Common Things

### Add a table with relations and actions

```typescript
// packages/features/admin-dataview/tables/invoice.ts
import type { TableDefinition } from "../types";
import { id, timestamps } from "./_helpers";

export const invoiceTable: TableDefinition = {
  modelName: "Invoice",
  displayName: "Invoice",
  displayNamePlural: "Invoices",
  description: "Payment invoices",
  slug: "invoices",
  category: "billing",
  fields: [
    id(),
    { column: "amount", label: "Amount", type: "number", access: "readonly", showInList: true },
    { column: "status", label: "Status", type: "enum", access: "readonly",
      enumValues: ["DRAFT", "SENT", "PAID", "VOID"], showInList: true },
    { column: "user", label: "Customer", type: "string", access: "readonly",
      relation: {
        modelName: "User",
        select: { id: true, name: true, email: true },
        displayField: "name",
        linkTo: { slug: "users", paramField: "id" },
      },
    },
    { column: "secretKey", label: "Secret", type: "string", access: "hidden" },
    ...timestamps(),
  ],
  actions: [
    {
      id: "void",
      label: "Void Invoice",
      variant: "destructive",
      mutation: "admin.voidInvoice",
      buildInput: (row) => ({ invoiceId: row.id }),
      condition: (row) => row.status !== "VOID",
      confirm: { title: "Void invoice #{{id}}?", description: "This cannot be undone." },
    },
  ],
};
```

Then add to `registry.ts` and you're done.
