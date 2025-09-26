# DataTable System Guide

A comprehensive guide to using Cal.com's DataTable system for building powerful, filterable, and paginated data tables.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Components](#core-components)
4. [Filter System](#filter-system)
5. [Segment System](#segment-system)
6. [Pagination Modes](#pagination-modes)
7. [Toolbar Components](#toolbar-components)
8. [Advanced Usage](#advanced-usage)
9. [Real-world Examples](#real-world-examples)
10. [TypeScript Types Reference](#typescript-types-reference)
11. [Troubleshooting](#troubleshooting)
12. [Testing Patterns](#testing-patterns)
13. [Best Practices](#best-practices)

## Overview

The DataTable system is a comprehensive solution for displaying tabular data with advanced features including:

- **Advanced filtering** with 5 filter types and custom operators
- **Segment system** for saving and sharing filter configurations
- **Traditional pagination** with page-based navigation (recommended)
- **Column management** (sorting, resizing, visibility)
- **Bulk actions** and selection management
- **Full TypeScript support**
- **Alternative infinite scroll** mode (has known issues, use with caution)

### Architecture

The system consists of three main layers:

1. **DataTableProvider** - Context provider managing all table state
2. **DataTableWrapper** - UI wrapper handling pagination, toolbars, and loading states
3. **DataTable** - Core table component with optional virtualization

#### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DataTableProvider                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Table State   │  │  Filter State   │  │ Segment State   │  │
│  │ • pagination    │  │ • columnFilters │  │ • activeSegment │  │
│  │ • sorting       │  │ • searchTerm    │  │ • userSegments  │  │
│  │ • columnVis     │  │ • activeFilters │  │ • systemSegments│  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DataTableWrapper                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Toolbar       │  │   Data Table    │  │   Pagination    │  │
│  │ • SearchBar     │  │ • Columns       │  │ • PageControls  │  │
│  │ • FilterBar     │  │ • Rows          │  │ • PageSize      │  │
│  │ • Segments      │  │ • Selection     │  │ • TotalCount    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend API                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Filter Processing│  │ Data Fetching   │  │ Response Format │  │
│  │ • makeWhereClause│  │ • Prisma Query  │  │ • data[]        │  │
│  │ • makeSqlCondition│  │ • Raw SQL      │  │ • totalCount    │  │
│  │ • Column Mapping │  │ • Pagination   │  │ • meta          │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Component Hierarchy

```
DataTableProvider (Context)
└── DataTableWrapper (UI Container)
    ├── Toolbar
    │   ├── ToolbarLeft
    │   │   ├── DataTableToolbar.SearchBar
    │   │   ├── DataTableFilters.FilterBar
    │   │   └── DataTableFilters.ColumnVisibilityButton
    │   └── ToolbarRight
    │       ├── DataTableFilters.ClearFiltersButton
    │       ├── DataTableSegment.SaveButton
    │       └── DataTableSegment.Select
    ├── DataTable (Core Table)
    │   ├── Table Header
    │   ├── Table Body (Virtualized/Standard)
    │   └── Selection Bar (Conditional)
    └── Pagination Controls
        ├── Page Navigation
        ├── Page Size Selector
        └── Total Count Display
```

## Quick Start

### Basic Setup

```tsx
import {
  DataTableProvider,
  DataTableWrapper,
  DataTableFilters,
  useDataTable,
  ColumnFilterType,
} from "@calcom/features/data-table";

// 1. Define your data type
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

// 2. Create columns with filtering support
const columns = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    meta: {
      type: ColumnFilterType.TEXT,
    },
  },
  {
    id: "role",
    header: "Role", 
    accessorKey: "role",
    meta: {
      type: ColumnFilterType.SINGLE_SELECT,
    },
  },
];

// 3. Setup the table
function UserTable() {
  const table = useReactTable({
    data: users,
    columns,
    // ... other table options
  });

  return (
    <DataTableProvider tableIdentifier="user-table">
      <DataTableWrapper
        table={table}
        paginationMode="standard"
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar />
            <DataTableFilters.FilterBar table={table} />
          </>
        }
        ToolbarRight={
          <>
            <DataTableFilters.ClearFiltersButton />
            <DataTableSegment.SaveButton />
            <DataTableSegment.Select />
          </>
        }
      />
    </DataTableProvider>
  );
}
```

## Core Components

### DataTableProvider

The context provider that manages all table state including filters, sorting, pagination, and segments.

#### Props

```tsx
interface DataTableProviderProps {
  tableIdentifier?: string;           // Unique identifier for the table
  children: React.ReactNode;
  useSegments?: UseSegments;          // Custom segment hook
  defaultPageSize?: number;           // Default: 10
  ctaContainerClassName?: string;     // CSS class for CTA container
  segments?: FilterSegmentOutput[];   // Provided segments
  timeZone?: string;                  // Timezone for date filters
  preferredSegmentId?: SegmentIdentifier | null;
  systemSegments?: SystemFilterSegment[];
}
```

#### Context Values

The provider exposes comprehensive state management:

```tsx
type DataTableContextType = {
  // Filters
  activeFilters: ActiveFilters;
  addFilter: (columnId: string) => void;
  updateFilter: (columnId: string, value: FilterValue) => void;
  removeFilter: (columnId: string) => void;
  clearAll: (exclude?: string[]) => void;

  // Sorting
  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;

  // Column management
  columnVisibility: VisibilityState;
  setColumnVisibility: OnChangeFn<VisibilityState>;
  columnSizing: ColumnSizingState;
  setColumnSizing: OnChangeFn<ColumnSizingState>;

  // Pagination
  pageIndex: number;
  pageSize: number;
  setPageIndex: (pageIndex: number | null) => void;
  setPageSize: (pageSize: number | null) => void;
  offset: number;
  limit: number;

  // Segments
  segments: CombinedFilterSegment[];
  selectedSegment: CombinedFilterSegment | undefined;
  segmentId: SegmentIdentifier | null;
  setSegmentId: (id: SegmentIdentifier | null) => void;
  canSaveSegment: boolean;
  isSegmentEnabled: boolean;

  // Search
  searchTerm: string;
  setSearchTerm: (searchTerm: string | null) => void;
};
```

### DataTableWrapper

The main wrapper component that handles UI concerns, pagination, and toolbar layout.

#### Props

```tsx
type DataTableWrapperProps<TData> = {
  table: ReactTableType<TData>;
  testId?: string;
  bodyTestId?: string;
  isPending?: boolean;
  totalRowCount?: number;
  variant?: "default" | "compact";
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: string;
  children?: React.ReactNode;
  tableContainerRef?: React.RefObject<HTMLDivElement>;
  onRowMouseclick?: (row: Row<TData>) => void;

  // Toolbar slots
  ToolbarLeft?: React.ReactNode;
  ToolbarRight?: React.ReactNode;
  
  // Loading states
  EmptyView?: React.ReactNode;
  LoaderView?: React.ReactNode;
} & (
  // Infinite pagination
  | {
      paginationMode: "infinite";
      hasNextPage: boolean;
      fetchNextPage: () => void;
      isFetching: boolean;
    }
  // Standard pagination  
  | {
      paginationMode: "standard";
      hasNextPage?: never;
      fetchNextPage?: never;
      isFetching?: never;
    }
);
```

### DataTable

The core table component with column resizing and pinning support.

#### Key Features

- **Column resizing** - Drag to resize columns
- **Column pinning** - Pin columns to left/right
- **Responsive design** - Adapts to mobile screens
- **Accessibility** - Full keyboard navigation support
- **Optional virtualization** - Available for infinite mode (use with caution)

## Filter System

The DataTable supports 5 filter types with various operators and options.

### Filter Types

#### 1. Single Select Filter

```tsx
{
  type: ColumnFilterType.SINGLE_SELECT,
  options: [
    { label: "Admin", value: "admin" },
    { label: "User", value: "user" },
    { label: "Guest", value: "guest" },
  ]
}
```

#### 2. Multi Select Filter

```tsx
{
  type: ColumnFilterType.MULTI_SELECT,
  options: [
    { label: "Engineering", value: "eng", section: "Departments" },
    { label: "Marketing", value: "marketing", section: "Departments" },
    { label: "Sales", value: "sales", section: "Departments" },
  ]
}
```

#### 3. Text Filter

```tsx
{
  type: ColumnFilterType.TEXT,
  textOptions: {
    allowedOperators: ["contains", "equals", "startsWith"],
    placeholder: "Search names..."
  }
}
```

**Available operators:**
- `equals` - Exact match
- `notEquals` - Not equal
- `contains` - Contains substring
- `notContains` - Does not contain
- `startsWith` - Starts with
- `endsWith` - Ends with
- `isEmpty` - Is empty
- `isNotEmpty` - Is not empty

#### 4. Number Filter

```tsx
{
  type: ColumnFilterType.NUMBER
}
```

**Available operators:**
- `eq` - Equal to
- `neq` - Not equal to
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal

#### 5. Date Range Filter

```tsx
{
  type: ColumnFilterType.DATE_RANGE,
  dateRangeOptions: {
    range: "past", // or "custom"
    convertToTimeZone: true
  }
}
```

### Column Filter Configuration

Add filtering to columns using the `meta` property:

```tsx
const columns = [
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    meta: {
      type: ColumnFilterType.SINGLE_SELECT,
      icon: "circle-dot", // Optional icon
    } as ColumnFilterMeta,
  },
  {
    id: "createdAt",
    header: "Created",
    accessorKey: "createdAt",
    meta: {
      type: ColumnFilterType.DATE_RANGE,
      dateRangeOptions: {
        range: "past",
        convertToTimeZone: true,
      },
    } as ColumnFilterMeta,
  },
];
```

### Faceted Filters with `getFacetedUniqueValues`

For select filters that need dynamic options based on data, use `getFacetedUniqueValues` in your table configuration:

```tsx
// In your table configuration
const table = useReactTable({
  // ... other options
  getFacetedUniqueValues: (_, columnId) => () => {
    switch (columnId) {
      case "teamId":
        return convertFacetedValuesToMap(
          teams.map(team => ({
            label: team.name,
            value: team.id
          }))
        );
      case "role":
        return convertFacetedValuesToMap([
          { label: "Admin", value: "admin" },
          { label: "Member", value: "member" }
        ]);
      default:
        return new Map();
    }
  }
});
```

**Custom Faceted Values Hook Example:**

From `apps/web/modules/bookings/hooks/useFacetedUniqueValues.ts`:

```tsx
export function useFacetedUniqueValues() {
  const eventTypes = useEventTypes();
  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const { data: members } = trpc.viewer.teams.listSimpleMembers.useQuery();
  
  return useCallback(
    (_: Table<any>, columnId: string) => (): Map<FacetedValue, number> => {
      if (columnId === "eventTypeId") {
        return convertFacetedValuesToMap(eventTypes || []);
      } else if (columnId === "teamId") {
        return convertFacetedValuesToMap(
          (teams || []).map((team) => ({
            label: team.name,
            value: team.id,
          }))
        );
      } else if (columnId === "userId") {
        return convertFacetedValuesToMap(
          (members || [])
            .map((member) => ({
              label: member.name,
              value: member.id,
            }))
            .filter((option): option is { label: string; value: number } => Boolean(option.label))
        );
      }
      return new Map<FacetedValue, number>();
    },
    [eventTypes, teams, members]
  );
}
```

**Usage in Table Configuration:**

```tsx
// From packages/features/users/components/UserTable/UserListTable.tsx
const table = useReactTable({
  // ... other options
  getFacetedUniqueValues: (_, columnId) => () => {
    if (facetedTeamValues) {
      switch (columnId) {
        case "role":
          return convertFacetedValuesToMap(facetedTeamValues.roles);
        case "teamId":
          return convertFacetedValuesToMap(facetedTeamValues.teams);
        default:
          return new Map();
      }
    }
    return new Map();
  }
});
```

### Filter Components

#### FilterBar

Displays active filters and add filter button:

```tsx
<DataTableFilters.FilterBar table={table} />
```

#### Individual Filter Components

```tsx
// Add filter button
<DataTableFilters.AddFilterButton table={table} />

// Active filters display
<DataTableFilters.ActiveFilters table={table} />

// Clear all filters
<DataTableFilters.ClearFiltersButton />

// Column visibility toggle
<DataTableFilters.ColumnVisibilityButton table={table} />
```

## Segment System

Segments allow users to save and share filter configurations. There are two types:

**Important:** Filter segments are only enabled when you pass the `useSegments` prop to `DataTableProvider`:

```tsx
<DataTableProvider
  tableIdentifier="users"
  useSegments={useSegments} // Required to enable segments
>
  {/* Your table content */}
</DataTableProvider>
```

Without the `useSegments` prop, segment functionality will be disabled and segment-related components will not be available.

### System Segments

Predefined segments created by developers:

```tsx
const systemSegments: SystemFilterSegment[] = [
  {
    id: "active-users",
    name: "Active Users",
    type: "system",
    activeFilters: [
      {
        f: "status",
        v: {
          type: ColumnFilterType.SINGLE_SELECT,
          data: "active"
        }
      }
    ],
    sorting: [{ id: "lastLogin", desc: true }],
  }
];

<DataTableProvider 
  systemSegments={systemSegments}
  tableIdentifier="user-table"
>
  {/* ... */}
</DataTableProvider>
```

### User Segments

Segments saved by users with personal or team scope:

```tsx
// Personal segment (scope: "USER")
// Team segment (scope: "TEAM")
```

### Segment Components

```tsx
// Segment selector dropdown
<DataTableSegment.Select />

// Save current state as segment
<DataTableSegment.SaveButton />

// Segment management (rename, duplicate, delete)
// Available in the segment dropdown submenu
```

### Segment Permissions

- **Personal segments**: Only visible to the creator
- **Team segments**: Visible to all team members
- **System segments**: Visible to all users
- **Admin actions**: Rename/delete require admin/owner permissions

## Pagination Modes

### Standard Pagination (Recommended)

Traditional page-based pagination is the recommended approach:

```tsx
<DataTableWrapper
  paginationMode="standard"
  totalRowCount={totalCount}
  table={table}
/>
```

**Features:**
- Page numbers and navigation
- Configurable page sizes
- Total count display
- Reliable performance
- Better user experience
- No virtualization issues

**Why Standard Mode is Preferred:**
Standard pagination provides a more predictable and stable user experience. It avoids the complexity and potential issues associated with virtualized infinite scrolling.

### Infinite Pagination (Use with Caution)

Alternative infinite scroll mode with known limitations:

```tsx
<DataTableWrapper
  paginationMode="infinite"
  hasNextPage={hasNextPage}
  fetchNextPage={fetchNextPage}
  isFetching={isFetching}
  table={table}
/>
```

**Features:**
- Automatic loading on scroll
- Virtualized rendering
- Fixed container height (80dvh)

**Known Issues:**
- Virtualized infinite loading has several problems
- Can cause performance and UX issues
- Standard mode was introduced to address these problems
- Use only when absolutely necessary and with thorough testing

## Toolbar Components

### DataTableToolbar

Container and utility components for table toolbars:

```tsx
// Toolbar container
<DataTableToolbar.Root>
  <DataTableToolbar.SearchBar />
  <DataTableToolbar.CTA color="primary" StartIcon="plus">
    Add User
  </DataTableToolbar.CTA>
</DataTableToolbar.Root>

// Search input with debounced updates
<DataTableToolbar.SearchBar className="max-w-48" />

// Clear filters button (auto-hides when no filters)
<DataTableToolbar.ClearFiltersButton />

// Custom action button
<DataTableToolbar.CTA 
  color="secondary" 
  StartIcon="download"
  onClick={handleExport}
>
  Export
</DataTableToolbar.CTA>
```

### DataTableSelectionBar

For bulk actions when rows are selected:

```tsx
{numberOfSelectedRows > 0 && (
  <DataTableSelectionBar.Root>
    <p>{t("number_selected", { count: numberOfSelectedRows })}</p>
    
    <DataTableSelectionBar.Button
      color="destructive"
      icon="trash-2"
      onClick={handleBulkDelete}
    >
      Delete Selected
    </DataTableSelectionBar.Button>
  </DataTableSelectionBar.Root>
)}
```

## Advanced Usage

### Server-Side Operations

The DataTable system is designed for **server-side filtering, sorting, and pagination** with standard pagination. This approach is necessary because we only fetch a limited number of items per page, unlike the previous infinite scrolling approach that cached large amounts of data and could filter on the client side.

#### Basic Server-Side Pattern

```tsx
// Get current table state for API calls
const { limit, offset, sorting } = useDataTable();
const columnFilters = useColumnFilters();

// Use in your API call
const { data } = trpc.users.list.useQuery({
  limit,
  offset,
  sorting,
  filters: columnFilters
});
```

#### Prisma Where Clause Construction

For Prisma-based backends, extract individual filters and build typed where conditions:

```tsx
// From packages/trpc/server/routers/viewer/organizations/listMembers.handler.ts
const roleFilter = filters.find((filter) => filter.id === "role") as
  | TypedColumnFilter<ColumnFilterType.MULTI_SELECT>
  | undefined;
const teamFilter = filters.find((filter) => filter.id === "teams") as
  | TypedColumnFilter<ColumnFilterType.MULTI_SELECT>
  | undefined;
const lastActiveAtFilter = filters.find((filter) => filter.id === "lastActiveAt") as
  | TypedColumnFilter<ColumnFilterType.DATE_RANGE>
  | undefined;

const whereClause: Prisma.MembershipWhereInput = {
  user: {
    ...(teamFilter && {
      teams: {
        some: {
          team: makeWhereClause({
            columnName: "name",
            filterValue: teamFilter.value,
          }),
        },
      },
    }),
    ...(lastActiveAtFilter &&
      makeWhereClause({
        columnName: "lastActiveAt",
        filterValue: lastActiveAtFilter.value,
      })),
  },
  teamId: organizationId,
  ...(roleFilter && makeWhereClause({
    columnName: "role",
    filterValue: roleFilter.value,
  })),
};
```

#### Raw SQL Optimization

For performance-critical queries, use raw SQL with `makeSqlCondition`:

```tsx
// From packages/lib/server/service/InsightsRoutingBaseService.ts
async getFilterConditions(): Promise<Prisma.Sql | null> {
  const conditions: Prisma.Sql[] = [];
  const columnFilters = this.filters.columnFilters || [];
  
  // Convert columnFilters array to object for easier access
  const filtersMap = columnFilters.reduce((acc, filter) => {
    acc[filter.id] = filter;
    return acc;
  }, {} as Record<string, TypedColumnFilter<ColumnFilterType>>);

  // Extract booking status order filter
  const bookingStatusOrder = filtersMap["bookingStatusOrder"];
  if (bookingStatusOrder && isMultiSelectFilterValue(bookingStatusOrder.value)) {
    const statusCondition = makeSqlCondition(bookingStatusOrder.value);
    if (statusCondition) {
      conditions.push(Prisma.sql`rfrd."bookingStatusOrder" ${statusCondition}`);
    }
  }

  // Extract booking UID filter
  const bookingUid = filtersMap["bookingUid"];
  if (bookingUid && isTextFilterValue(bookingUid.value)) {
    const uidCondition = makeSqlCondition(bookingUid.value);
    if (uidCondition) {
      conditions.push(Prisma.sql`rfrd."bookingUid" ${uidCondition}`);
    }
  }

  // Join all conditions with AND
  return conditions.reduce((acc, condition, index) => {
    if (index === 0) return condition;
    return Prisma.sql`(${acc}) AND (${condition})`;
  });
}
```

#### Advanced Parameter Manipulation

For complex cases where you need to manipulate filter data before sending to the backend, extract the logic into a separate hook:

```tsx
// packages/features/insights/hooks/useInsightsRoutingParameters.ts
export function useInsightsRoutingParameters() {
  const { scope, selectedTeamId } = useInsightsOrgTeams();
  
  // Get date range filter and manipulate it
  const createdAtRange = useFilterValue("createdAt", ZDateRangeFilterValue)?.data;
  const startDate = useChangeTimeZoneWithPreservedLocalTime(
    useMemo(() => {
      return dayjs(createdAtRange?.startDate ?? getDefaultStartDate().toISOString())
        .startOf("day")
        .toISOString();
    }, [createdAtRange?.startDate])
  );
  
  // Get other column filters excluding the manipulated ones
  const columnFilters = useColumnFilters({
    exclude: ["createdAt"],
  });

  return {
    scope,
    selectedTeamId,
    startDate,
    endDate,
    columnFilters,
  };
}
```

#### Key Hooks for Server-Side Integration

- **`useColumnFilters()`** - Get applied filters for backend requests
- **`useDataTable()`** - Get `limit`, `offset`, `sorting` for pagination
- **`useFilterValue(columnId, schema)`** - Get specific filter value with validation
- **Custom parameter hooks** - Extract complex manipulation logic

#### Server Utility Functions

The DataTable system provides utility functions for both Prisma and raw SQL approaches:

- **`makeWhereClause()`** - Converts filter values to Prisma where clause objects
- **`makeSqlCondition()`** - Converts filter values to raw SQL conditions
- **`makeOrderBy()`** - Converts sorting state to Prisma orderBy format

### Custom Hooks

#### useDataTable

Access the DataTable context:

```tsx
const {
  activeFilters,
  sorting,
  columnVisibility,
  pageIndex,
  pageSize,
  searchTerm,
  selectedSegment,
} = useDataTable();
```

#### useColumnFilters

Get processed column filters for API calls:

```tsx
const columnFilters = useColumnFilters();
// Returns: ColumnFilter[] ready for backend consumption

// With exclusions (useful when manipulating specific filters)
const columnFilters = useColumnFilters({
  exclude: ["createdAt", "dateRange"]
});
```

#### useFilterableColumns

Extract filterable columns from table definition:

```tsx
const filterableColumns = useFilterableColumns(table);
```

### Custom Filter Components

Create custom filter implementations:

```tsx
function CustomStatusFilter({ column }: { column: Column<any> }) {
  const { updateFilter } = useDataTable();
  
  return (
    <Select
      onValueChange={(value) => 
        updateFilter(column.id, {
          type: ColumnFilterType.SINGLE_SELECT,
          data: value
        })
      }
    >
      {/* Custom filter UI */}
    </Select>
  );
}
```

### Portal Integration

Use portals for toolbar actions:

```tsx
const { ctaContainerRef } = useDataTable();

{ctaContainerRef.current && createPortal(
  <div className="flex gap-2">
    <Button>Custom Action</Button>
  </div>,
  ctaContainerRef.current
)}
```

## Real-world Examples

### Example 1: User Management Table

From `packages/features/users/components/UserTable/UserListTable.tsx`:

```tsx
<DataTableWrapper<UserTableUser>
  testId="user-list-data-table"
  table={table}
  isPending={isPending}
  totalRowCount={data?.meta?.totalRowCount}
  paginationMode="standard"
  ToolbarLeft={
    <>
      <DataTableToolbar.SearchBar />
      <DataTableFilters.ColumnVisibilityButton table={table} />
      <DataTableFilters.FilterBar table={table} />
    </>
  }
  ToolbarRight={
    <>
      <DataTableFilters.ClearFiltersButton />
      <DataTableSegment.SaveButton />
      <DataTableSegment.Select />
    </>
  }
>
  {/* Selection bar for bulk actions */}
  {numberOfSelectedRows > 0 && (
    <DataTableSelectionBar.Root>
      <p>{t("number_selected", { count: numberOfSelectedRows })}</p>
      <DeleteBulkUsers
        users={table.getSelectedRowModel().flatRows.map(row => row.original)}
        onRemove={() => table.toggleAllPageRowsSelected(false)}
      />
    </DataTableSelectionBar.Root>
  )}
</DataTableWrapper>
```

### Example 2: Bookings List

From `apps/web/modules/bookings/views/bookings-listing-view.tsx`:

```tsx
<DataTableWrapper
  className="mb-6"
  tableContainerRef={tableContainerRef}
  table={table}
  testId={`${status}-bookings`}
  bodyTestId="bookings"
  headerClassName="hidden"
  isPending={query.isPending}
  totalRowCount={query.data?.totalCount}
  variant="compact"
  paginationMode="standard"
  ToolbarLeft={
    <DataTableFilters.FilterBar table={table} />
  }
  ToolbarRight={
    <>
      <DataTableFilters.ClearFiltersButton />
      <DataTableSegment.SaveButton />
      <DataTableSegment.Select />
    </>
  }
  LoaderView={<SkeletonLoader />}
  EmptyView={
    <EmptyScreen
      Icon="calendar"
      headline={t("no_status_bookings_yet", { status: t(status).toLowerCase() })}
      description={t("no_status_bookings_yet_description")}
    />
  }
/>
```

### Example 3: Team Member List with Infinite Scroll

From `packages/features/ee/teams/components/MemberList.tsx`:

```tsx
<DataTableWrapper
  testId="team-member-list-container"
  table={table}
  tableContainerRef={tableContainerRef}
  isPending={isPending}
  paginationMode="infinite"
  hasNextPage={hasNextPage}
  fetchNextPage={fetchNextPage}
  isFetching={isFetching}
  ToolbarLeft={
    <>
      <DataTableToolbar.SearchBar />
      <DataTableFilters.FilterBar table={table} />
    </>
  }
  ToolbarRight={
    <>
      <DataTableFilters.ClearFiltersButton />
      <DataTableSegment.SaveButton />
      <DataTableSegment.Select />
    </>
  }
>
  {/* Bulk selection and actions */}
  {numberOfSelectedRows > 0 && (
    <DataTableSelectionBar.Root>
      <TeamListBulkAction table={table} />
      <MassAssignAttributesBulkAction table={table} filters={columnFilters} />
    </DataTableSelectionBar.Root>
  )}
</DataTableWrapper>
```

## TypeScript Types Reference

### Core Types

```tsx
// Filter value types
type FilterValue = 
  | SingleSelectFilterValue
  | MultiSelectFilterValue  
  | TextFilterValue
  | NumberFilterValue
  | DateRangeFilterValue;

// Active filter structure
type ActiveFilter = {
  f: string;           // field/column ID
  v?: FilterValue;     // filter value
};

// Segment types
type SegmentIdentifier = 
  | { id: string; type: "system" }
  | { id: number; type: "user" };

// Column filter metadata
type ColumnFilterMeta = {
  type: ColumnFilterType;
  icon?: IconName;
  dateRangeOptions?: DateRangeFilterOptions;
  textOptions?: TextFilterOptions;
};
```

### Filter Value Schemas

```tsx
// Single select
type SingleSelectFilterValue = {
  type: ColumnFilterType.SINGLE_SELECT;
  data: string | number;
};

// Multi select
type MultiSelectFilterValue = {
  type: ColumnFilterType.MULTI_SELECT;
  data: Array<string | number>;
};

// Text filter
type TextFilterValue = {
  type: ColumnFilterType.TEXT;
  data: {
    operator: TextFilterOperator;
    operand: string;
  };
};

// Number filter
type NumberFilterValue = {
  type: ColumnFilterType.NUMBER;
  data: {
    operator: NumberFilterOperator;
    operand: number;
  };
};

// Date range filter
type DateRangeFilterValue = {
  type: ColumnFilterType.DATE_RANGE;
  data: {
    startDate: string | null;
    endDate: string | null;
    preset: string;
  };
};
```

### Segment Types

```tsx
// System segment (predefined)
type SystemFilterSegment = {
  id: string;
  name: string;
  type: "system";
  activeFilters: ActiveFilters;
  sorting?: SortingState;
  columnVisibility?: Record<string, boolean>;
  columnSizing?: Record<string, number>;
  perPage?: number;
  searchTerm?: string | null;
};

// User segment (saved by users)
type UserFilterSegment = FilterSegmentOutput & {
  type: "user";
};

// Combined segment type
type CombinedFilterSegment = SystemFilterSegmentInternal | UserFilterSegment;
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Filters Not Working

**Problem:** Filters appear but don't affect the data displayed.

**Causes & Solutions:**
- **Missing `useSegments` prop:** Filter segments require `useSegments={useSegments}` in `DataTableProvider`
- **Server-side filtering not implemented:** Ensure your API endpoint processes `useColumnFilters()` output
- **Column ID mismatch:** Verify filter column IDs match your data column accessors

```tsx
// ❌ Wrong: Missing useSegments prop
<DataTableProvider tableIdentifier="users">

// ✅ Correct: Include useSegments prop
<DataTableProvider tableIdentifier="users" useSegments={useSegments}>
```

#### 2. Pagination Not Working

**Problem:** Pagination controls don't change the displayed data.

**Causes & Solutions:**
- **Missing server-side pagination:** Use `useDataTable()` to get `limit`, `offset`, `pageIndex`
- **Incorrect `totalRowCount`:** Ensure your API returns accurate total count
- **Wrong pagination mode:** Use `paginationMode="standard"` for most cases

```tsx
// ✅ Correct: Implement server-side pagination
const { limit, offset, pageIndex, pageSize } = useDataTable();
const { data } = useQuery({
  queryKey: ['users', { limit, offset }],
  queryFn: () => fetchUsers({ limit, offset })
});
```

#### 3. Performance Issues

**Problem:** Table is slow or unresponsive with large datasets.

**Causes & Solutions:**
- **Using infinite mode incorrectly:** Switch to `paginationMode="standard"`
- **Not memoizing columns:** Wrap column definitions in `useMemo()`
- **Server-side optimization needed:** Implement proper indexing and query optimization

```tsx
// ✅ Correct: Memoize column definitions
const columns = useMemo(() => [
  { id: "name", header: "Name", accessorKey: "name" }
], []);
```

#### 4. TypeScript Errors

**Problem:** Type errors when using DataTable components.

**Causes & Solutions:**
- **Missing generic types:** Specify data type in `DataTableWrapper<YourDataType>`
- **Incorrect filter value types:** Use proper `FilterValue` types from the system
- **Column meta missing:** Add `meta: { type: ColumnFilterType.* }` to filterable columns

```tsx
// ✅ Correct: Proper typing
<DataTableWrapper<UserData>
  table={table}
  // ... other props
/>
```

#### 5. Segments Not Saving

**Problem:** User segments don't persist or save properly.

**Causes & Solutions:**
- **Missing segment hooks:** Ensure `useSegments` is properly configured
- **Authentication issues:** Verify user has permission to save segments
- **Backend not handling segments:** Check segment API endpoints are implemented

#### 6. Faceted Filters Empty

**Problem:** Select filters show no options.

**Causes & Solutions:**
- **Missing `getFacetedUniqueValues`:** Implement this function in your table config
- **Data not loaded:** Ensure faceted data is fetched before table renders
- **Incorrect data format:** Use `convertFacetedValuesToMap()` utility

```tsx
// ✅ Correct: Implement getFacetedUniqueValues
const table = useReactTable({
  // ... other options
  getFacetedUniqueValues: (_, columnId) => () => {
    switch (columnId) {
      case "status":
        return convertFacetedValuesToMap(statusOptions);
      default:
        return new Map();
    }
  }
});
```

#### 7. Search Not Working

**Problem:** Search bar doesn't filter results.

**Causes & Solutions:**
- **Server-side search not implemented:** Process `searchTerm` from `useDataTable()`
- **Debouncing issues:** Use the built-in `DataTableToolbar.SearchBar` component
- **Column search configuration:** Ensure searchable columns are properly configured

### Debugging Tips

1. **Use React DevTools:** Inspect DataTable context values
2. **Check Network Tab:** Verify API calls include correct filter parameters
3. **Console Logging:** Add logs to custom hooks to trace data flow
4. **Type Checking:** Run `yarn type-check:ci` to catch type issues early

## Testing Patterns

### Unit Testing DataTable Components

The DataTable system uses **Vitest** for testing with comprehensive patterns for different component types.

#### Testing Utility Functions

```tsx
// Example: Testing filter utility functions
import { describe, expect, it, vi } from "vitest";
import { makeSqlCondition } from "../server";
import { ColumnFilterType } from "../types";

describe("makeSqlCondition", () => {
  it("should create equals condition for single-select values", () => {
    const filterValue = {
      type: ColumnFilterType.SINGLE_SELECT,
      data: "option1",
    };

    const result = makeSqlCondition(filterValue);
    expect(result).toEqual(Prisma.sql`= ${"option1"}`);
  });

  it("should handle edge cases", () => {
    const filterValue = {
      type: ColumnFilterType.MULTI_SELECT,
      data: [],
    };

    const result = makeSqlCondition(filterValue);
    expect(result).toEqual(Prisma.sql`= ANY(${[]})`);
  });
});
```

#### Testing Date/Time Functions

```tsx
// Example: Testing date range utilities with mocking
import { describe, it, expect, vi } from "vitest";
import dayjs from "@calcom/dayjs";

// Mock dayjs for consistent test results
vi.mock("@calcom/dayjs", () => {
  const mockDayjs = vi.fn(() => ({
    startOf: vi.fn().mockReturnThis(),
    endOf: vi.fn().mockReturnThis(),
    toISOString: vi.fn().mockReturnValue("2024-03-20T00:00:00.000Z"),
  }));
  return { default: mockDayjs };
});

describe("getDateRangeFromPreset", () => {
  it("should return today's date range for 'tdy' preset", () => {
    const result = getDateRangeFromPreset("tdy");
    expect(result.preset.value).toBe("tdy");
    expect(dayjs).toHaveBeenCalled();
  });
});
```

#### Testing React Components

```tsx
// Example: Testing DataTable components
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DataTableProvider } from "../DataTableProvider";
import { DataTableWrapper } from "../components/DataTableWrapper";

const mockTable = {
  getRowModel: () => ({ rows: [] }),
  getHeaderGroups: () => [],
  getState: () => ({ pagination: { pageIndex: 0, pageSize: 10 } }),
  // ... other required table methods
};

describe("DataTableWrapper", () => {
  it("should render with basic props", () => {
    render(
      <DataTableProvider tableIdentifier="test">
        <DataTableWrapper
          table={mockTable}
          testId="test-table"
          isPending={false}
        />
      </DataTableProvider>
    );

    expect(screen.getByTestId("test-table")).toBeInTheDocument();
  });

  it("should show loading state when isPending is true", () => {
    render(
      <DataTableProvider tableIdentifier="test">
        <DataTableWrapper
          table={mockTable}
          testId="test-table"
          isPending={true}
          LoaderView={<div>Loading...</div>}
        />
      </DataTableProvider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
```

#### Testing Custom Hooks

```tsx
// Example: Testing DataTable hooks
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useColumnFilters } from "../hooks/useColumnFilters";
import { DataTableProvider } from "../DataTableProvider";

const wrapper = ({ children }) => (
  <DataTableProvider tableIdentifier="test">
    {children}
  </DataTableProvider>
);

describe("useColumnFilters", () => {
  it("should return empty array when no filters applied", () => {
    const { result } = renderHook(() => useColumnFilters(), { wrapper });
    expect(result.current).toEqual([]);
  });

  it("should exclude specified columns", () => {
    const { result } = renderHook(
      () => useColumnFilters({ exclude: ["createdAt"] }),
      { wrapper }
    );
    // Test that excluded columns are not in the result
  });
});
```

#### Testing Server-Side Integration

```tsx
// Example: Testing API integration patterns
import { describe, it, expect, vi } from "vitest";
import { makeWhereClause } from "../server";

describe("Server Integration", () => {
  it("should build correct Prisma where clause", () => {
    const filters = [
      {
        id: "status",
        value: { type: ColumnFilterType.SINGLE_SELECT, data: "active" }
      }
    ];

    const whereClause = makeWhereClause({
      columnName: "status",
      filterValue: filters[0].value
    });

    expect(whereClause).toEqual({ status: "active" });
  });
});
```

### Testing Best Practices

#### 1. Mock External Dependencies
- **Always mock `dayjs`** for consistent date/time testing
- **Mock API calls** using MSW or vi.mock()
- **Mock React Query** for data fetching tests

#### 2. Test Edge Cases
- **Empty data arrays** for multi-select filters
- **Invalid filter types** and malformed data
- **Timezone transitions** for date-related functions
- **Large datasets** for performance testing

#### 3. Component Testing Strategy
- **Unit tests** for utility functions and hooks
- **Integration tests** for component interactions
- **E2E tests** for complete user workflows (when needed)

#### 4. Test File Organization
```
packages/features/data-table/
├── lib/
│   ├── __tests__/
│   │   ├── server.test.ts
│   │   └── preserveLocalTime.test.ts
│   └── dateRange.test.ts
├── components/
│   └── __tests__/
│       ├── DataTable.test.tsx
│       └── DataTableWrapper.test.tsx
└── hooks/
    └── __tests__/
        └── useColumnFilters.test.tsx
```

#### 5. Common Test Utilities

```tsx
// Create reusable test utilities
export const createMockTable = (overrides = {}) => ({
  getRowModel: () => ({ rows: [] }),
  getHeaderGroups: () => [],
  getState: () => ({ pagination: { pageIndex: 0, pageSize: 10 } }),
  ...overrides,
});

export const renderWithDataTableProvider = (
  component: React.ReactElement,
  options = {}
) => {
  const wrapper = ({ children }) => (
    <DataTableProvider tableIdentifier="test" {...options}>
      {children}
    </DataTableProvider>
  );
  
  return render(component, { wrapper });
};
```

## Best Practices

### Performance

1. **Use standard pagination** for most use cases (recommended)
2. **Implement proper memoization** for column definitions
3. **Debounce search inputs** (handled automatically by DataTableToolbar.SearchBar)
4. **Consider infinite mode only for specific cases** where traditional pagination isn't suitable, but be aware of potential issues

### State Management

1. **Provide unique tableIdentifier** for each table instance
2. **Use segments** for complex filter combinations
3. **Persist user preferences** via the segment system
4. **Clear filters appropriately** when changing contexts

### User Experience

1. **Provide loading states** with LoaderView and EmptyView
2. **Use standard pagination** for consistent user experience
3. **Include search functionality** for text-heavy data
4. **Implement bulk actions** for management interfaces
5. **Show filter counts** and active filter indicators

### Accessibility

1. **Use semantic HTML** (handled by components)
2. **Provide proper ARIA labels** for custom filters
3. **Support keyboard navigation** (built-in)
4. **Test with screen readers**

### Code Organization

```tsx
// ✅ Good: Memoize column definitions
const columns = useMemo(() => [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    meta: { type: ColumnFilterType.TEXT },
  },
], []);

// ✅ Good: Extract filter logic
const useUserFilters = () => {
  const columnFilters = useColumnFilters();
  return useMemo(() => 
    transformFiltersForAPI(columnFilters), 
    [columnFilters]
  );
};

// ✅ Good: Separate concerns
function UserTableContainer() {
  const filters = useUserFilters();
  const { data, isPending } = useUsers(filters);
  
  return (
    <DataTableProvider tableIdentifier="users">
      <UserTable data={data} isPending={isPending} />
    </DataTableProvider>
  );
}
```

### Common Patterns

#### Filter Integration with API

```tsx
function useTableData() {
  const columnFilters = useColumnFilters();
  const { sorting, pageIndex, pageSize, searchTerm } = useDataTable();
  
  const queryParams = useMemo(() => ({
    filters: columnFilters,
    sorting,
    page: pageIndex,
    limit: pageSize,
    search: searchTerm,
  }), [columnFilters, sorting, pageIndex, pageSize, searchTerm]);
  
  return useQuery({
    queryKey: ['table-data', queryParams],
    queryFn: () => fetchData(queryParams),
  });
}
```

#### Custom Filter Options

```tsx
function useStatusFilterOptions() {
  const { data: statuses } = useStatuses();
  
  return useMemo(() => 
    statuses?.map(status => ({
      label: status.name,
      value: status.id,
      section: status.category,
    })) || [],
    [statuses]
  );
}
```

#### Segment Presets

```tsx
const BOOKING_SEGMENTS: SystemFilterSegment[] = [
  {
    id: "upcoming",
    name: "Upcoming",
    type: "system",
    activeFilters: [
      {
        f: "status",
        v: { type: ColumnFilterType.SINGLE_SELECT, data: "confirmed" }
      },
      {
        f: "startTime",
        v: { 
          type: ColumnFilterType.DATE_RANGE, 
          data: { preset: "future", startDate: null, endDate: null }
        }
      }
    ],
    sorting: [{ id: "startTime", desc: false }],
  },
];
```

This guide covers the complete DataTable system. For specific implementation details, refer to the source files in `packages/features/data-table/` and the usage examples throughout the Cal.com codebase.
