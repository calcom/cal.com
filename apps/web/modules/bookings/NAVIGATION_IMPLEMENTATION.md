# Booking Details Sheet Navigation Implementation

This document describes the implementation of the booking details sheet navigation feature following a clean, separation-of-concerns architecture.

## Architecture Overview

The implementation uses the **Adapter Pattern** with a **deferred selection mechanism** to separate view-agnostic navigation logic from view-specific navigation strategies, while preventing duplicate data fetches.

```
┌─────────────────────────────────────────────────────────────┐
│              BookingDetailsSheetStoreProvider                │
│  - Watches for booking changes                              │
│  - Auto-selects based on pendingSelection indicator         │
│  - Manages URL sync                                         │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                  Core Navigation Store                       │
│  (View-agnostic, handles only booking selection & UI state) │
│  - No data fetching                                         │
│  - Delegates to capabilities for page/week changes          │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────┴────────┐                    ┌────────┴───────┐
│  List Adapter  │                    │ Calendar       │
│                │                    │ Adapter        │
│ - Page index   │                    │ - Week start   │
│ - Pending sel. │                    │ - Pending sel. │
│ - Prefetching  │                    │ - NO fetching  │
└────────────────┘                    └────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            ▼
                  Parent Component's TRPC Query
                  (Handles ALL data fetching)
```

## Problem Solved: Duplicate TRPC Calls

### Original Issue

The initial implementation had a critical bug where navigating to the next/previous page caused **duplicate TRPC calls**:

1. `capabilities.requestNextPeriod()` called `setPageIndex(currentPageIndex + 1)`
2. `setPageIndex()` triggered the parent component's TRPC query to refetch
3. `capabilities.requestNextPeriod()` ALSO called `trpcUtils.viewer.bookings.get.fetch()`
4. Result: **Two identical TRPC calls** fetching the same data

### Root Cause

The adapter was doing too much - it was both:

- Managing navigation state (page index)
- Fetching data directly

This violated separation of concerns and caused the parent component's query to fetch redundantly.

### Solution: Deferred Selection Pattern

Instead of fetching data, the adapter now:

1. Sets a `pendingSelection` indicator ("first" or "last")
2. Updates the page index via `setPageIndex()`
3. Returns empty array (no direct fetch)
4. Parent component's query handles the actual data fetching
5. Provider watches for new data and auto-selects based on the indicator

This ensures:

- ✅ Only ONE TRPC call (via parent's query)
- ✅ Adapter focuses on navigation state only
- ✅ Selection happens AFTER new data arrives
- ✅ Clean separation of responsibilities

## Key Components

### 1. Core Navigation Store

**File:** `apps/web/modules/bookings/store/bookingDetailsSheetStore.tsx`

The core store is completely view-agnostic and handles:

- Tracking the selected booking UID
- Managing the current bookings array
- Navigating within the current array
- Delegating to capabilities when array boundaries are reached
- Managing transition state during async navigation

**Key Features:**

- ✅ Zero conditionals based on view type
- ✅ 100% testable in isolation
- ✅ Works for any view type (list, calendar, future views)
- ✅ Clean async/await pattern for boundary navigation

### 2. List Navigation Adapter

**File:** `apps/web/modules/bookings/hooks/useListNavigationCapabilities.ts`

Provides pagination-specific navigation capabilities:

- Calculates page boundaries based on limit/offset
- Prefetches the next page automatically (using shared query params from parent)
- Updates page index when navigating (parent component's query handles fetching)
- Returns `pendingSelection` indicator ("first" or "last") for auto-selection
- Provides `clearPendingSelection()` callback to reset the indicator

**Key Changes**:

1. **No Direct Fetching**: The adapter NO LONGER fetches data directly. It only:

   - Updates the page index via `setPageIndex()`
   - Sets `pendingSelection` state to indicate which item to auto-select
   - Returns empty array from `requestNextPeriod()`/`requestPreviousPeriod()` for backward compatibility

2. **Shared Query Params**: Accepts `queryInput` from parent to avoid duplicating parameter building logic. The parent builds query params once, and the adapter reuses them for prefetching with updated offset.

This prevents duplicate TRPC calls since `setPageIndex()` already triggers the parent component's query.

### 3. Calendar Navigation Adapter

**File:** `apps/web/modules/bookings/hooks/useCalendarNavigationCapabilities.ts`

Provides week-based navigation capabilities:

- Calculates next/previous week dates
- Updates calendar view's selected week (parent component's query handles fetching)
- Returns `pendingSelection` indicator ("first" or "last") for auto-selection
- Provides `clearPendingSelection()` callback to reset the indicator

**Key Change**: Like the list adapter, this NO LONGER fetches data directly. It only:

1. Updates the week start date via `setCurrentWeekStart()`
2. Sets `pendingSelection` state to indicate which item to auto-select
3. Returns empty array from `requestNextPeriod()`/`requestPreviousPeriod()` for backward compatibility

This prevents duplicate TRPC calls since `setCurrentWeekStart()` already triggers the parent component's query (which watches `currentWeekStart` as a dependency).

### 4. Integration Points

**BookingListContainer:**

- Creates list navigation capabilities via `useListNavigationCapabilities()`
- Receives: `{ capabilities, pendingSelection, clearPendingSelection }`
- Passes all three to the store provider
- Only when `bookingsV3Enabled` is true
- Its TRPC query handles all data fetching (triggered by page index changes)

**BookingDetailsSheetStoreProvider:**

- Accepts `bookings`, `capabilities`, `pendingSelection`, and `clearPendingSelection` props
- Watches for booking changes via `previousBookingsRef`
- When bookings change AND `pendingSelection` is set:
  - Selects first booking if `pendingSelection === "first"`
  - Selects last booking if `pendingSelection === "last"`
  - Clears transition state
  - Calls `clearPendingSelection()` to reset indicator
- This creates a deferred selection mechanism that waits for new data

**BookingCalendarContainer:**

- Creates calendar navigation capabilities via `useCalendarNavigationCapabilities()`
- Receives: `{ capabilities, pendingSelection, clearPendingSelection }`
- Passes all three to the store provider
- Always enabled for calendar view
- Its TRPC infinite query handles all data fetching (triggered by `currentWeekStart` changes)

**BookingDetailsSheet:**

- Uses new navigation methods: `navigateNext()` / `navigatePrevious()`
- Shows loading state during transitions
- Enables buttons based on capabilities

## Benefits

### 1. Separation of Concerns

Each piece has ONE job:

- **Store**: Manages navigation state and delegates to capabilities
- **Provider**: Watches for data changes and handles auto-selection
- **List Adapter**: Manages page index and pending selection indicator (no data fetching)
- **Calendar Adapter**: Handles week navigation
- **Containers**: Wire everything together AND handle data fetching via TRPC queries

### 2. No Conditional Complexity

The store has **zero conditionals** based on view type. The type system enforces correct usage at compile time.

### 3. No Duplicate Fetches

**Problem Solved**: Previously, `setPageIndex()` AND `capabilities.fetch()` both triggered TRPC calls.

**Solution**: Capabilities only update page index. Parent component's existing TRPC query handles all fetching.

### 4. Deferred Selection Pattern

The `pendingSelection` indicator creates a clean separation between:

- **Triggering navigation** (adapter sets indicator + updates page index)
- **Selecting booking** (provider watches for new data and selects accordingly)

This ensures selection happens AFTER new data arrives, not before.

### 5. Easy to Test

- Test store independently with mock capabilities
- Test each adapter independently with mock data
- Test provider's auto-selection logic independently
- No need to test all view combinations

### 6. Easy to Extend

Want to add a new view type (e.g., agenda view)?

1. Create `useAgendaNavigationCapabilities.ts`
2. Implement the same pattern (return capabilities + pendingSelection + clear function)
3. Wire it into the container
4. Done! No changes to the core store or other views.

### 7. Better Performance

- No duplicate TRPC calls
- Async/await pattern is clearer than intent flags
- Prefetching is handled by adapters
- No re-renders from unnecessary state changes
- Leverages existing TRPC query caching

## Usage Example

```typescript
// In BookingListContainer

// Build query input once - shared between query and prefetching
const queryInput = useMemo(
  () => ({
    limit,
    offset,
    filters: {
      statuses: [props.status],
      eventTypeIds,
      teamIds,
      userIds,
      attendeeName,
      attendeeEmail,
      bookingUid,
      afterStartDate: dateRange?.startDate
        ? dayjs(dateRange?.startDate).startOf("day").toISOString()
        : undefined,
      beforeEndDate: dateRange?.endDate
        ? dayjs(dateRange?.endDate).endOf("day").toISOString()
        : undefined,
    },
  }),
  [limit, offset, props.status, eventTypeIds, teamIds, userIds, attendeeName, attendeeEmail, bookingUid, dateRange]
);

// Use the same queryInput for both the main query and navigation capabilities
const query = trpc.viewer.bookings.get.useQuery(queryInput, {
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});

const navigationResult = useListNavigationCapabilities({
  limit,
  offset,
  totalCount: query.data?.totalCount,
  setPageIndex,
  queryInput, // Pass shared query params for prefetching
});

// navigationResult contains:
// - capabilities: NavigationCapabilities (methods to trigger navigation)
// - pendingSelection: "first" | "last" | null (indicator for auto-selection)
// - clearPendingSelection: () => void (callback to reset indicator)

return (
  <BookingDetailsSheetStoreProvider
    bookings={bookings}
    capabilities={navigationResult.capabilities}
    pendingSelection={navigationResult.pendingSelection}
    clearPendingSelection={navigationResult.clearPendingSelection}>
    {/* ... */}
  </BookingDetailsSheetStoreProvider>
);

// In BookingDetailsSheet
const navigateNext = useBookingDetailsSheetStore(s => s.navigateNext);
const canGoNext = hasNextInArray ||
  (isLastInArray && capabilities?.canNavigateToNextPeriod());

<Button disabled={!canGoNext} onClick={navigateNext} />
```

## Navigation Flow

### Within Current Array

1. User clicks "Next" button
2. `navigateNext()` is called
3. Store checks `hasNextInArray()`
4. If true, sets `selectedBookingUid` to next booking
5. Sheet re-renders with new booking

### Crossing Array Boundary (e.g., to next page)

**The New Flow (Prevents Duplicate Fetches):**

1. User clicks "Next" at last booking in array
2. `navigateNext()` is called
3. Store checks `hasNextInArray()` → false
4. Store checks `capabilities.canNavigateToNextPeriod()` → true
5. Store sets `isTransitioning = true` (disables buttons)
6. Store calls `capabilities.requestNextPeriod()`
7. **Adapter sets `pendingSelection = "first"`** (indicator for auto-selection)
8. **Adapter calls `setPageIndex(currentPageIndex + 1)`** (triggers parent's query)
9. **Adapter returns empty array** (no direct fetching)
10. **Parent component's TRPC query detects page index change**
11. **Parent's query fetches new bookings with updated offset**
12. **New bookings arrive → Provider detects change via ref**
13. **Provider sees `pendingSelection === "first"`**
14. **Provider selects `bookings[0]`**
15. **Provider clears transition state: `isTransitioning = false`**
16. **Provider calls `clearPendingSelection()`**
17. Sheet re-renders with new booking

**For Previous Page Navigation:**

- Same flow, but `pendingSelection = "last"`
- Provider selects `bookings[bookings.length - 1]`

### Crossing Array Boundary (Calendar View - to next week)

**Same Pattern as List View:**

1. User clicks "Next" at last booking in current week's array
2. `navigateNext()` is called
3. Store checks `hasNextInArray()` → false
4. Store checks `capabilities.canNavigateToNextPeriod()` → true (always true for calendar)
5. Store sets `isTransitioning = true` (disables buttons)
6. Store calls `capabilities.requestNextPeriod()`
7. **Adapter sets `pendingSelection = "first"`**
8. **Adapter calls `setCurrentWeekStart(nextWeekStart)`** (triggers parent's query)
9. **Adapter returns empty array** (no direct fetching)
10. **Parent component's TRPC infinite query detects `currentWeekStart` change**
11. **Parent's query fetches bookings for new week** (with updated date range)
12. **New bookings arrive → Provider detects change via ref**
13. **Provider sees `pendingSelection === "first"`**
14. **Provider selects `bookings[0]`**
15. **Provider clears transition state: `isTransitioning = false`**
16. **Provider calls `clearPendingSelection()`**
17. Sheet re-renders with new booking

**Key Benefits (Both Views):**

- ✅ No duplicate TRPC calls (only one fetch via parent's query)
- ✅ Adapters only manage navigation state, not data fetching
- ✅ Auto-selection happens when new data arrives
- ✅ Clean separation of concerns
- ✅ Consistent pattern across both list and calendar views

## Comparison: Before vs After

| Aspect                     | Before                    | After (Current)                            |
| -------------------------- | ------------------------- | ------------------------------------------ |
| **Navigation**             | Only within current array | Seamless across pages/weeks                |
| **TRPC Calls**             | N/A                       | Single call per navigation (no duplicates) |
| **Data Fetching**          | N/A                       | Parent component handles (via TRPC query)  |
| **Adapter Responsibility** | N/A                       | Navigation state only (no fetching)        |
| **Selection Timing**       | N/A                       | Deferred until new data arrives            |
| **Auto-Selection**         | N/A                       | First item on next page, last on previous  |
| **Store Complexity**       | ~80 lines                 | ~180 lines (with docs + legacy)            |
| **View Logic**             | Mixed in components       | Isolated in adapters                       |
| **Conditionals**           | N/A                       | Zero view-type conditionals                |
| **Testability**            | Limited                   | Full isolation possible                    |
| **Extensibility**          | Add to components         | Create new adapter                         |

## Implementation Checklist

### Phase 1: Core Store ✅

- [x] Create `bookingNavigationStore.ts`
- [x] Implement core navigation logic
- [ ] Write unit tests for store

### Phase 2: List Adapter ✅

- [x] Create `useListNavigationCapabilities.ts`
- [x] Implement prefetching logic
- [ ] Write tests for list adapter

### Phase 3: Calendar Adapter ✅

- [x] Create `useCalendarNavigationCapabilities.ts`
- [x] Implement week navigation logic
- [ ] Write tests for calendar adapter

### Phase 4: Integration ✅

- [x] Update `BookingListContainer`
- [x] Update `BookingCalendarContainer`
- [x] Update `BookingDetailsSheet`
- [x] Test end-to-end

### Phase 5: Testing & Polish

- [ ] Unit tests for core store
- [ ] Unit tests for adapters
- [ ] Integration tests
- [ ] E2E tests

## Edge Cases Handled

1. **Empty Results**: Provider checks `bookings.length > 0` before auto-selecting
2. **Race Conditions**: `isTransitioning` flag prevents double-navigation
3. **Filter Changes**: Capabilities are recreated when filters change
4. **URL Sync**: Provider handles bidirectional sync between store and URL
5. **Async Errors**: Try/catch in navigation methods
6. **Stale Pending Selection**: `clearPendingSelection()` ensures indicator is reset after use
7. **Rapid Navigation**: Provider only acts when bookings actually change (via ref comparison)
8. **Multiple Re-renders**: `pendingSelection` is cleared immediately after handling

## Performance Considerations

1. **Prefetching**: List adapter prefetches next page automatically
2. **Memoization**: All hooks use `useMemo` for derived values
3. **Selective Re-renders**: Store updates are atomic
4. **TRPC Caching**: Leverages existing cache management

## Future Enhancements

1. **Keyboard Navigation**: Add arrow key support
2. **Swipe Gestures**: Mobile swipe to navigate
3. **Prefetch Previous**: Also prefetch previous page
4. **Smart Prefetching**: Prefetch based on scroll position
5. **Agenda View**: Add new view type with daily navigation
