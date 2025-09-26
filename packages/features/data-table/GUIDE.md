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
11. [Best Practices](#best-practices)

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
