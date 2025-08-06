# Calendar Cache Data Integration - Dual System

## Background and Motivation

The user requested to add new cache data to the CalendarToggleContainer component while maintaining separation of concerns. The goal is to display cache update information for connected calendars from both the legacy `calendar-cache` system and the newer `calendar-cache-sql` system without removing existing functionality.

## Key Challenges and Analysis

1. **Dual Cache Systems**: Need to handle both legacy JSONB-based cache and new SQL-based cache
2. **Separation of Concerns**: The handler was directly handling cache logic, which violates the controller pattern
3. **Backward Compatibility**: Need to maintain existing data structure while adding new cache information
4. **UI Integration**: Display both cache systems in a user-friendly format without cluttering the interface
5. **Type Safety**: Ensure proper typing for the new cache data structure
6. **System Independence**: Each cache system should be completely independent and not depend on the other
7. **Service Containment**: Keep services self-contained with minimal public API
8. **Calendar-Level Granularity**: Each individual calendar should have its own cache status, not just at the credential level

## High-level Task Breakdown

- [x] **Task 1**: Create CalendarCacheService to handle legacy cache data fetching and processing

  - Success Criteria: Service can fetch cache status by credential IDs and enrich calendar data
  - Status: ✅ Completed

- [x] **Task 2**: Create CalendarCacheSqlService to handle SQL cache data fetching and processing

  - Success Criteria: Service can fetch SQL cache status by credential IDs and enrich calendar data
  - Status: ✅ Completed

- [x] **Task 3**: Update connectedCalendars handler to use both cache services independently

  - Success Criteria: Handler no longer contains cache logic, uses both services independently
  - Status: ✅ Completed

- [x] **Task 4**: Fix typing signatures and data merging approach

  - Success Criteria: Proper typing and robust data merging using credentialId lookup
  - Status: ✅ Completed

- [x] **Task 5**: Update CalendarToggleContainer to display both cache systems

  - Success Criteria: Component displays both legacy and SQL cache data with clear separation
  - Status: ✅ Completed

- [x] **Task 6**: Implement calendar-level cache status granularity
  - Success Criteria: Each individual calendar shows its own cache status, not just at credential level
  - Status: ✅ Completed

## Project Status Board

### Completed Tasks

- [x] Created `CalendarCacheService` with proper separation of concerns for legacy cache
- [x] Created `CalendarCacheSqlService` with proper separation of concerns for SQL cache
- [x] Updated handler to use both services independently instead of direct repository access
- [x] Added dual cache data display to CalendarToggleContainer with namespaced props
- [x] Maintained backward compatibility with existing data structure
- [x] Ensured system independence - each cache service operates independently
- [x] Fixed typing signatures and improved service containment
- [x] Implemented robust credentialId-based data merging
- [x] Implemented calendar-level cache status granularity

### Current Status / Progress Tracking

**Current Phase**: Implementation Complete

- All core functionality implemented
- Both legacy and SQL cache data are now displayed in the UI
- Separation of concerns maintained
- Legacy data preserved
- Clear distinction between cache systems in UI
- **Independent systems** - each cache service operates completely independently
- **Proper typing** - clean, contained service APIs
- **Robust data merging** - credentialId-based lookup instead of fragile array indices
- **Calendar-level granularity** - each individual calendar shows its own cache status

## Executor's Feedback or Assistance Requests

The implementation is complete and follows the requirements:

1. **Separation of Concerns**: Created separate services for each cache system, keeping the handler as a pure controller
2. **Namespaced Props**: Used `cacheData` and `sqlCacheData` props to namespace the cache information
3. **Legacy Data Preservation**: Existing functionality remains unchanged
4. **Helper Usage**: Used both services as helpers to maintain clean architecture
5. **Dual System Support**: Both legacy JSONB cache and new SQL cache are supported
6. **System Independence**: Each cache service operates independently without depending on the other
7. **Service Containment**: Services are self-contained with minimal public API
8. **Robust Data Merging**: Uses credentialId-based lookup for reliable data merging
9. **Calendar-Level Granularity**: Each individual calendar shows its own cache status

The cache data is now displayed as:

- **Legacy Cache**: Shows at the credential level (e.g., "Legacy Cache: Aug 5, 06:04 PM")
- **SQL Cache**: Shows at the individual calendar level (e.g., "SQL Cache: Aug 5, 06:04 PM (1 sub)")

This provides users with comprehensive visibility into both cache systems and their update status at the appropriate granularity levels.

## Architecture Improvements

**Independent Systems**: Each cache service now operates completely independently:

- `CalendarCacheService` enriches with legacy cache data
- `CalendarCacheSqlService` enriches with SQL cache data
- Handler merges results from both independent operations
- No service depends on the output of another service

**Service Containment**: Services are properly contained:

- Removed unnecessary public interfaces
- Single public method per service
- Internal implementation details hidden
- Clean, focused APIs

**Robust Data Merging**: Fixed the handler to use credentialId-based lookup instead of fragile array indexing:

- Creates maps for efficient lookup by credentialId
- Ensures data integrity even if arrays have different ordering
- More maintainable and type-safe approach

**Calendar-Level Granularity**: Implemented proper cache status at individual calendar level:

- Each calendar has its own `externalId` and can have its own subscription
- SQL cache status is shown per individual calendar
- Legacy cache status remains at credential level (as designed)
- UI clearly shows which cache system applies to which level

## Lessons

- When adding new data to existing components, use namespaced props to maintain clear separation
- Services should handle business logic, controllers should only coordinate
- Date formatting should be user-friendly and localized
- Always maintain backward compatibility when adding new features
- When dealing with multiple similar systems, create separate services for each to maintain clean architecture
- Clear labeling in UI helps users understand different cache systems
- **System independence is crucial** - avoid dependencies between similar systems
- Use `Promise.all` for parallel independent operations to improve performance
- **Service containment** - keep services focused with minimal public API
- **Data merging strategy** - use credentialId-based lookup instead of array indices for robustness
- **Granularity matters** - understand the data model and show cache status at the appropriate level
