# Deep Enrichment Phase Implementation Plan

## TODO

### 1. Create DeepEnrichmentPhase Structure
- [ ] Create `packages/features/bookings/lib/utils/phases/deepEnrichment.ts`
- [ ] Define `DeepEnrichmentInputContext` type extending `QuickValidationOutputContext`
- [ ] Define `DeepEnrichmentOutputContext` type with enriched data
- [ ] Define `IDeepEnrichmentService` interface with `enrich` method
- [ ] Define `IDeepEnrichmentServiceDependencies` interface for DI

### 2. Implement DeepEnrichmentService Class
- [ ] Create service class implementing `IDeepEnrichmentService`
- [ ] Add constructor with proper DI dependencies
- [ ] Extract eventType enrichment logic (if needed beyond QuickEnrichment)
- [ ] Extract routingFormResponse enrichment logic from legacyHandler (lines 589-611)
- [ ] Extract qualified/fixed hosts loading logic from legacyHandler (lines 613-625)
- [ ] Extract guest sanitization logic from legacyHandler (lines 1034-1053)
- [ ] Extract payment data preparation logic
- [ ] Extract property derivation logic (isDryRun, isRescheduling, isSeatedEvent)

### 3. Update Dependency Injection
- [ ] Add DeepEnrichmentService to DI container in `packages/lib/di/modules/BookingCreateService.ts`
- [ ] Update `IBookingCreateServiceDependencies` interface to include `deepEnrichmentService`
- [ ] Update BookingCreateService constructor to inject the new service

### 4. Integrate Phase into BookingCreateService
- [ ] Add deepEnrichmentService call in `legacyHandler` after quickValidation
- [ ] Remove extracted logic from legacyHandler
- [ ] Update context passing between phases
- [ ] Ensure proper error handling and logging

### 5. Update Type Definitions
- [ ] Update relevant import statements
- [ ] Ensure type safety across all phase transitions
- [ ] Update any affected interfaces or types

## Success Criteria

### Functional Requirements
- [ ] All existing booking flows continue to work without regression
- [ ] EventType enrichment works correctly
- [ ] RoutingFormResponse is properly loaded when present
- [ ] Qualified and fixed hosts are loaded with credentials
- [ ] Team member guests are properly filtered out
- [ ] Payment data is correctly prepared when required
- [ ] Properties like isDryRun, isRescheduling, isSeatedEvent are properly derived
- [ ] Error handling maintains existing behavior

### Code Quality Requirements
- [ ] Follows existing phase pattern (Input/Output contexts, Interface, Service class)
- [ ] Proper dependency injection following DI container pattern
- [ ] Clean separation of concerns
- [ ] Maintains existing logging and error handling
- [ ] Type safety preserved
- [ ] No code duplication
- [ ] Code must be copied as is as long as other requirements of code quality are met. 

### Testing Requirements
- [ ] All existing tests pass
- [ ] Type checks pass without errors
- [ ] No linting errors
- [ ] Integration tests for booking flow still work



## Feedback from user
- [ ] isTeamEventType implementation is different from the earlier code. It was supposed to use schedulingType but it is using teamId.
- [ ] Don't mutate values returned by service. Create new variable and mutate that instead