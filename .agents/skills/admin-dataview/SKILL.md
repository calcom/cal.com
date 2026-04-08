# Admin DataView — Agent Skill

Add tables, actions, panels, and action forms to the Admin Data Studio (`/admin/data/[slug]`).

## Architecture Overview

```
packages/features/admin-dataview/           ← Shared: types, registry, service, tRPC router
  types.ts                                  ← All type definitions
  registry.ts                               ← Central table registry (register new tables here)
  AdminTable.ts                             ← Wrapper class with query builders
  AdminTableRegistry.ts                     ← O(1) lookup by slug/model + reverse relations
  server/service.ts                         ← Prisma query execution
  server/trpc-router.ts                     ← authedAdminProcedure endpoints
  tables/                                   ← One file per Prisma model
  tables/_helpers.ts                        ← Reusable field builders (id, uuid, timestamps)

apps/web/modules/admin-dataview/            ← Frontend only
  components/panels/PanelRenderer.tsx       ← Panel component registry + renderer
  components/panels/BillingPanel.tsx        ← Example panel
  components/action-forms/ActionFormRegistry.tsx  ← Action form component registry
  components/action-forms/*.tsx             ← Action form implementations
  hooks/useActionExecutor.ts                ← Executes actions via tRPC HTTP
```

## Data Flow

```
TableDefinition (tables/my-model.ts)
  → registry.ts (ALL_TABLES array)
    → AdminTableRegistry (O(1) slug/model lookup)
      → AdminDataViewService (builds Prisma select/where/orderBy)
        → tRPC router (authedAdminProcedure)
          → Frontend (StudioTable, RecordDetailModal, RowActions)
```

---

## Task 1: Add a New Table

### Step 1 — Create the table definition

Create `packages/features/admin-dataview/tables/<model-name>.ts`:

```typescript
/* v8 ignore start */
import type { TableDefinition } from "../types";
import { id, timestamps } from "./_helpers";

export const myModelTable: TableDefinition = {
  modelName: "MyModel",          // Must match Prisma model name (PascalCase)
  displayName: "My Model",
  displayNamePlural: "My Models",
  description: "Short description for sidebar",
  slug: "my-models",             // URL-safe → /admin/data/my-models
  category: "core",              // "core" | "billing" | "platform" | "abuse" | "system"
  defaultSort: "id",
  defaultSortDirection: "desc",
  pageSize: 50,
  fields: [
    id(),
    // ... field definitions (see Field Reference below)
    ...timestamps(),
  ],
  actions: [],   // Optional — see Task 3
  panels: [],    // Optional — see Task 4
};
```

### Step 2 — Register in the registry

Edit `packages/features/admin-dataview/registry.ts`:

```typescript
import { myModelTable } from "./tables/my-model";

const ALL_TABLES: TableRegistry = [
  // ... existing tables
  myModelTable,
] as const;
```

That's it. The table appears in the sidebar and is fully browseable.

### Helper Functions

From `tables/_helpers.ts`:

| Helper | Output |
|--------|--------|
| `id()` | `{ column: "id", type: "number", isPrimary: true, access: "readonly", showInList: true }` |
| `id({ type: "string" })` | Same but for string PKs (UUIDs) |
| `uuid()` | `{ column: "uuid", type: "string", access: "readonly", showInList: false }` |
| `uuid("customCol")` | Custom column name for UUID |
| `...timestamps()` | `[createdAt (showInList: true), updatedAt (showInList: false)]` |

---

## Field Reference

Every field in the `fields` array follows this shape:

```typescript
{
  column: "email",            // Prisma column name
  label: "Email",             // UI label
  type: "email",              // See Field Types below
  access: "editable",         // "readonly" (default) | "editable" | "hidden"
  searchable: true,           // Include in global search
  showInList: true,           // Show in table view (default: true)
  isPrimary: true,            // Exactly one per table
  description: "Tooltip",     // Tooltip text
  enumValues: ["A", "B"],     // Required for type: "enum"
  relation: { ... },          // See Relations below
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
| `"readonly"` | Visible in list + detail (default) |
| `"editable"` | Visible, marked editable (future inline editing) |
| `"hidden"` | Never fetched from DB — use for passwords, secrets, metadata |

### Key Rules

- Exactly **one field** must have `isPrimary: true` per table
- Set `access: "hidden"` on sensitive columns — they are excluded from the Prisma `select`
- Set `showInList: false` to hide from the table grid but still show in detail view
- `searchable: true` only works on `string`, `email`, `url`, and `number` types

---

## Task 2: Add Relations

Relations are defined inline on a field via the `relation` property.

### To-One Relation (drill-down link)

```typescript
{
  column: "user",                // Prisma relation name
  label: "Owner",
  type: "string",
  access: "readonly",
  relation: {
    modelName: "User",           // Target Prisma model
    select: { id: true, name: true, email: true },  // Keep minimal!
    displayField: "name",        // Field to show in the cell
    linkTo: {
      slug: "users",             // Target table slug for navigation
      paramField: "id",          // PK field on target
    },
  },
}
```

**Custom FK column**: If the FK doesn't follow `${relationName}Id` convention:

```typescript
relation: {
  modelName: "User",
  select: { id: true, name: true },
  displayField: "name",
  fkColumn: "ownerId",           // Override: default would be "userId"
  linkTo: { slug: "users", paramField: "id" },
}
```

### To-Many Relation (count badge + expandable preview)

```typescript
{
  column: "members",
  label: "Members",
  type: "number",                // Use "number" for count display
  access: "readonly",
  relation: {
    modelName: "Membership",
    select: {
      id: true,
      userId: true,
      role: true,
      user: { select: { id: true, name: true, email: true } },  // Nested sub-relation OK
    },
    displayField: "_count",      // Special value: renders count badge
    many: true,
    take: 20,                    // Limit preview items
  },
}
```

### Reverse Relations

Reverse relations are **computed automatically**. If table A has a to-one relation pointing to table B, the detail view for B will show "A records (as fieldName)" with lazy-loaded pagination. No configuration needed.

---

## Task 3: Add Actions

Actions are row-level operations in the context menu and detail view dropdown.

### Simple Action (direct mutation)

Add to the `actions` array in your table definition:

```typescript
actions: [
  {
    id: "lock",                              // Unique within this table
    label: "Lock Account",
    icon: "lock",                            // coss icon name (optional)
    variant: "destructive",                  // "default" | "destructive"
    mutation: "admin.lockUserAccount",       // tRPC path (see Mutation Routing)
    buildInput: (row) => ({                  // Build mutation input from row
      userId: row.id,
      locked: true,
    }),
    condition: (row) => !row.locked,         // Show only when unlocked (optional)
    confirm: {                               // Confirmation dialog (optional)
      title: "Lock {{name}}?",              // {{field}} interpolation
      description: "{{email}} will be unable to log in.",
      confirmLabel: "Lock",
    },
  },
],
```

### Mutation Path Routing

The `mutation` string maps to tRPC endpoints via HTTP:

```
"admin.lockUserAccount"      → POST /api/trpc/admin/lockUserAccount
"users.delete"               → POST /api/trpc/users/delete
"admin.watchlist.delete"     → POST /api/trpc/admin/watchlist.delete
"organizations.adminVerify"  → POST /api/trpc/organizations/adminVerify
```

Pattern: first segment = endpoint, rest = procedure path.

### Confirmation Dialog

Use `{{fieldName}}` to interpolate row values:

```typescript
confirm: {
  title: "Delete {{name}}?",
  description: "This will permanently delete {{email}} (ID: {{id}}).",
  confirmLabel: "Delete forever",
}
```

### Conditional Actions (toggle pattern)

```typescript
actions: [
  {
    id: "lock",
    label: "Lock Account",
    variant: "destructive",
    mutation: "admin.lockUserAccount",
    buildInput: (row) => ({ userId: row.id, locked: true }),
    condition: (row) => !row.locked,
  },
  {
    id: "unlock",
    label: "Unlock Account",
    variant: "default",
    mutation: "admin.lockUserAccount",
    buildInput: (row) => ({ userId: row.id, locked: false }),
    condition: (row) => row.locked === true,
  },
],
```

---

## Task 4: Add an Action Form (multi-step / complex actions)

For actions that need user input beyond a simple confirm, use custom form components.

### Step 1 — Reference the form in the table definition

```typescript
actions: [
  {
    id: "transfer-ownership",
    label: "Transfer Ownership",
    icon: "arrow-right",
    variant: "default",
    mutation: "admin.transferOwnership",   // Not called directly by the framework
    buildInput: (row) => ({ teamId: row.id }),
    formId: "transfer-ownership",          // Maps to ACTION_FORM_COMPONENTS key
  },
],
```

### Step 2 — Create the form component

Create `apps/web/modules/admin-dataview/components/action-forms/MyActionForm.tsx`:

```typescript
"use client";

import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { ActionFormProps } from "./ActionFormRegistry";

export function MyActionForm({ row, onComplete, onCancel }: ActionFormProps) {
  const [inputValue, setInputValue] = useState("");

  const mutation = trpc.viewer.admin.myMutation.useMutation({
    onSuccess: () => {
      showToast("Action completed", "success");
      onComplete();     // Closes the form dialog + refreshes data
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <div className="space-y-3">
      <div className="text-xs text-subtle">
        Context about record #{row.id}{row.name ? ` (${row.name})` : ""}
      </div>

      <TextField
        label="Some Input"
        name="someInput"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />

      {mutation.error && (
        <p className="text-error text-xs">{mutation.error.message}</p>
      )}

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          loading={mutation.isPending}
          onClick={() => mutation.mutate({ id: row.id as number, value: inputValue })}>
          Execute
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

### Step 3 — Register in ActionFormRegistry

Edit `apps/web/modules/admin-dataview/components/action-forms/ActionFormRegistry.tsx`:

```typescript
import { MyActionForm } from "./MyActionForm";

export const ACTION_FORM_COMPONENTS: Record<string, React.ComponentType<ActionFormProps>> = {
  // ... existing forms
  "my-action": MyActionForm,
};
```

### ActionFormProps Interface

```typescript
interface ActionFormProps {
  table: AdminTable;                      // Full table definition
  row: Record<string, unknown>;           // Current row data
  onComplete: () => void;                 // Call on success (closes dialog + refreshes)
  onCancel: () => void;                   // Call to close without action
}
```

### Multi-Step Form Pattern (Preview → Execute)

Use two mutations with a `mode` parameter:

```typescript
export function TransferForm({ row, onComplete, onCancel }: ActionFormProps) {
  const previewMutation = trpc.viewer.admin.transfer.useMutation();
  const executeMutation = trpc.viewer.admin.transfer.useMutation({
    onSuccess: () => { showToast("Done", "success"); onComplete(); },
    onError: (err) => { showToast(err.message, "error"); },
  });

  const previewData = previewMutation.data?.mode === "preview" ? previewMutation.data : null;

  return (
    <div className="space-y-3">
      {/* Input fields */}
      <div className="flex gap-2">
        {!previewData ? (
          <>
            <Button onClick={() => previewMutation.mutate({ ...input, mode: "preview" })}>
              Preview
            </Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </>
        ) : (
          <>
            {/* Render preview data */}
            <Button onClick={() => executeMutation.mutate({ ...input, mode: "execute" })}>
              Confirm
            </Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Task 5: Add a Panel

Panels are custom widgets in the record detail view, below the field list.

### Step 1 — Define the panel on the table

```typescript
panels: [
  {
    id: "billing",                                      // Must match PANEL_COMPONENTS key
    label: "Billing & Subscription",
    condition: (row) => row.isOrganization === true,    // Optional: conditional visibility
  },
],
```

### Step 2 — Register the panel component

Edit `apps/web/modules/admin-dataview/components/panels/PanelRenderer.tsx`:

```typescript
const PANEL_COMPONENTS: Record<
  string,
  {
    Component: React.ComponentType<{ data: any; row: Record<string, unknown> }>;
    useData: (row: Record<string, unknown>) => { data: any; isPending: boolean };
  }
> = {
  // ... existing panels
  "my-panel": {
    Component: ({ data, row }) => <MyPanel data={data} />,
    useData: (row) => {
      const id = row.id as number;
      const { data, isPending } = trpc.viewer.admin.dataview.myPanelData.useQuery(
        { id },
        { enabled: !!id }
      );
      return { data, isPending };
    },
  },
};
```

### Step 3 — Add tRPC endpoint (if needed)

If the panel needs custom data, add a query to `packages/features/admin-dataview/server/trpc-router.ts`:

```typescript
myPanelData: authedAdminProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    // Use readonlyPrisma with select (never include)
    const data = await readonlyPrisma.myModel.findUnique({
      where: { id: input.id },
      select: { id: true, status: true /* ... */ },
    });
    return data;
  }),
```

---

## Checklist

### Adding a table
- [ ] Created `packages/features/admin-dataview/tables/<name>.ts`
- [ ] `modelName` matches the Prisma model exactly (PascalCase)
- [ ] Exactly one field has `isPrimary: true`
- [ ] Sensitive fields have `access: "hidden"`
- [ ] Relation `select` objects are minimal (no `include`, no `*`)
- [ ] Added import + entry to `registry.ts` `ALL_TABLES` array
- [ ] File starts with `/* v8 ignore start */` (table definitions are declarative, not unit-tested)

### Adding an action
- [ ] `id` is unique within the table's actions array
- [ ] `mutation` path corresponds to an existing tRPC procedure
- [ ] `buildInput` returns the correct shape for that mutation
- [ ] `condition` returns false to hide when not applicable
- [ ] Destructive actions have `variant: "destructive"` and a `confirm` dialog
- [ ] `confirm` strings use `{{field}}` interpolation (not template literals)

### Adding an action form
- [ ] Created form component in `apps/web/modules/admin-dataview/components/action-forms/`
- [ ] Component accepts `ActionFormProps` and calls `onComplete()` on success, `onCancel()` on dismiss
- [ ] Registered in `ACTION_FORM_COMPONENTS` in `ActionFormRegistry.tsx`
- [ ] `formId` in the action definition matches the registry key
- [ ] Uses `showToast` for success/error feedback
- [ ] Form has a Cancel button that calls `onCancel`

### Adding a panel
- [ ] Registered in `PANEL_COMPONENTS` in `PanelRenderer.tsx` with `Component` + `useData`
- [ ] `id` in the table's `panels` array matches the `PANEL_COMPONENTS` key
- [ ] `useData` hook uses `enabled` guard (e.g. `{ enabled: !!id }`)
- [ ] Custom tRPC endpoint added if needed (uses `readonlyPrisma` + `select`)
- [ ] `condition` function set if the panel should only show for certain rows

---

## Common Patterns from Existing Code

### Enum field with filter

```typescript
{
  column: "status",
  label: "Status",
  type: "enum",
  access: "readonly",
  enumValues: ["ACCEPTED", "PENDING", "CANCELLED", "REJECTED"],
  showInList: true,
}
```

### Self-referencing relation (e.g. parent org)

```typescript
{
  column: "parent",
  label: "Parent Org",
  type: "string",
  access: "readonly",
  relation: {
    modelName: "Team",
    select: { id: true, name: true, slug: true },
    displayField: "name",
    linkTo: { slug: "teams", paramField: "id" },
  },
}
```

### String primary key (UUIDs)

```typescript
fields: [
  id({ type: "string" }),  // For models with string/UUID PKs
  // ...
]
```

### Categories

| Category | Use for |
|----------|---------|
| `"core"` | Users, Teams, Bookings, Event Types |
| `"billing"` | Billing, subscriptions, payments, credits |
| `"platform"` | Apps, webhooks, workflows |
| `"abuse"` | Watchlist, reports, abuse scores |
| `"system"` | Features, settings, impersonation logs |
