# BookingCreateService Refactoring Plan - Easiest First Approach

## Overview
Refactor the monolithic `BookingCreateService` (2,461 lines) into smaller, focused services using **incremental extraction** without feature flags. Starting with the easiest phases to build confidence and momentum.

## Migration Strategy: Incremental Extraction (Easiest First)

### Core Principles
- Single codebase - no duplicate implementations
- Incremental changes - one service at a time
- Backwards compatible - existing interfaces unchanged
- Low risk - each step is independently valuable
- No feature flags - direct migration with confidence
- Start easy to build momentum and confidence

## Phase-by-Phase Plan (Ordered by Complexity - Easiest First)

### **Phase 1: Preparation** - **Complexity: 2/10**
**Goal:** Set up infrastructure and extract utilities

#### Tasks:
1. **Extract Pure Utility Functions**
   - Create `packages/features/bookings/lib/utils/BookingUtils.ts`
   - Move `buildDryRunBooking` (lines 163-260)
   - Move `buildEventForTeamEventType` (lines 269-356)
   - Move `getICalSequence` (lines 146-159)
   - Move `formatAvailabilitySnapshot` (lines 400-415)
   - Move `assertNonEmptyArray` (lines 140-144)

2. **Extract Pure Validation Utilities**
   - Create `packages/features/bookings/lib/utils/ValidationUtils.ts`
   - Move pure validation helper functions like `assertNonEmptyArray`
   - Only pure functions with no dependencies or business logic
   - Save complex validation logic for Phase 3 (BookingValidationService)

3. **Update DI Infrastructure**
   - Add new DI tokens in `packages/lib/di/tokens.ts`
   - Prepare DI modules for upcoming services
   - No breaking changes to existing factory

4. **Update BookingCreateService**
   - Import and use extracted utilities
   - Replace inline utility calls with imported functions
   - Remove utility function definitions from service

#### Deliverables:
- Utilities extracted and tested
- BookingCreateService size reduced by ~200 lines
- DI infrastructure ready for service extraction
- All tests passing with no behavior changes

---

### **Phase 2: Extract Validation Service** - **Complexity: 4/10**
**Goal:** Centralize all booking validation logic



#### Tasks:
1. **Create BookingValidationService**
   - Create `packages/features/bookings/lib/service/BookingValidationService.ts`
   - Consolidate email blocking checks (`checkIfBookerEmailIsBlocked`)
   - Combine booking limits validation (`checkActiveBookingsLimitForBooker`)
   - Include time bounds validation (`validateBookingTimeIsNotOutOfBounds`)
   - Handle event length validation (`validateEventLength`)
   - Centralize attendee and guest validation

2. **Refactor BookingCreateService**
   - Replace scattered validation calls with single service call
   - Remove inline validation logic
   - Standardize error handling and error messages
   - Call validation service early in the booking flow

3. **Update Dependencies**
   - Add validation service to DI container
   - Inject into BookingCreateService
   - Update service interfaces

#### Benefits:
- Centralized validation logic
- Consistent error handling
- Easier to add new validation rules
- Better testability
- ~300 lines reduction

---

### **Phase 3: Extract Webhook Service** - **Complexity: 3/10**
**Goal:** Centralize webhook management



#### Tasks:
1. **Create BookingWebhookService**
   - Create `packages/features/bookings/lib/service/BookingWebhookService.ts`
   - Extract webhook trigger logic
   - Handle webhook scheduling and data preparation
   - Include webhook error handling
   - Move webhook-related code from lines around 2118-2297

2. **Update BookingCreateService**
   - Inject BookingWebhookService as dependency
   - Replace inline webhook calls with service calls
   - Remove webhook-specific logic
   - Maintain same webhook triggering behavior

3. **Update DI Configuration**
   - Add BookingWebhookService to DI container
   - Create webhook service module
   - Update BookingCreateService dependencies

#### Benefits:
- Webhook logic centralized and isolated
- Better webhook reliability and testing
- Easier to add new webhook types
- ~150 lines reduction

---

### **Phase 4: Extract Payment Service** - **Complexity: 5/10**
**Goal:** Isolate payment processing complexity



#### Tasks:
1. **Create BookingPaymentService**
   - Create `packages/features/bookings/lib/service/BookingPaymentService.ts`
   - Extract payment processing logic (lines 2138-2222)
   - Handle payment validation and credential checks
   - Manage payment-required booking flows
   - Include payment webhook handling

2. **Streamline BookingCreateService**
   - Remove payment complexity from main flow
   - Simplify payment-required response building
   - Clean up payment error handling
   - Delegate all payment operations to service

3. **Update Configuration**
   - Add payment service to DI
   - Handle payment service dependencies
   - Update service interfaces

#### Benefits:
- Payment logic isolated and testable
- Easier to add new payment providers
- Cleaner separation of financial concerns
- ~200 lines reduction

---

### **Phase 5: Extract Notification Service** - **Complexity: 6/10**
**Goal:** Centralize all communication logic



#### Tasks:
1. **Create BookingNotificationService**
   - Create `packages/features/bookings/lib/service/BookingNotificationService.ts`
   - Consolidate email sending logic (`sendScheduledEmailsAndSMS`, `sendRescheduledEmailsAndSMS`)
   - Handle SMS notifications
   - Manage workflow reminders (`scheduleWorkflowReminders`)
   - Include confirmation and request emails
   - Handle round-robin specific notifications

2. **Clean BookingCreateService**
   - Remove email/SMS scattered throughout
   - Simplify notification triggering
   - Standardize notification interfaces
   - Remove workflow reminder logic

3. **Update Dependencies**
   - Add notification service to DI
   - Handle workflow dependencies
   - Update notification interfaces

#### Results:
- All notifications in one place
- Easier to add new notification channels
- Better notification testing and reliability
- ~350 lines reduction

---

### **Phase 6: Final Orchestration** - **Complexity: 6/10**
**Goal:** Transform BookingCreateService into orchestrator



#### Tasks:
1. **Refactor BookingCreateService**
   - Convert to orchestrator pattern
   - Coordinate between extracted services
   - Maintain clean error handling
   - Preserve external interface exactly

2. **Performance Optimization**
   - Add parallel processing where possible
   - Optimize service coordination
   - Improve error recovery and rollback

3. **Documentation Update**
   - Document new service architecture
   - Update API documentation
   - Create service interaction diagrams

#### Final State After Phase 6:
- BookingCreateService: ~800 lines (orchestrator)
- 4 focused services: ~1200 lines total
- Same external behavior
- Better maintainability and testability

---

### **Phase 7: Extract Event Manager Service** - **Complexity: 7/10**
**Goal:** Isolate calendar integration complexity



#### Tasks:
1. **Create BookingEventManagerService**
   - Create `packages/features/bookings/lib/service/BookingEventManagerService.ts`
   - Extract EventManager operations
   - Handle calendar integrations (create/reschedule)
   - Manage video call setup and URL generation
   - Include integration status handling (`handleAppsStatus`)

2. **Simplify BookingCreateService**
   - Remove calendar integration details
   - Clean up video call logic
   - Standardize event creation interface
   - Delegate all calendar operations to service

3. **Update Configuration**
   - Add event manager service to DI
   - Handle calendar credential dependencies
   - Update integration interfaces

#### Outcomes:
- Calendar integrations isolated
- Easier to add new calendar providers
- Better error handling for integrations
- ~300 lines reduction

---

### **Phase 8: Extract Availability Service** - **Complexity: 8/10**
**Goal:** Isolate user availability and assignment logic



#### Tasks:
1. **Create BookingAvailabilityService**
   - Create `packages/features/bookings/lib/service/BookingAvailabilityService.ts`
   - Extract user loading and validation (`loadAndValidateUsers`)
   - Handle round-robin lucky user selection (lines 875-985)
   - Manage seat availability for seated events
   - Include availability checking logic (`ensureAvailableUsers`)

2. **Simplify BookingCreateService**
   - Replace complex availability logic with service calls
   - Remove user assignment algorithms
   - Clean up seat-related availability checks
   - Remove lucky user selection complexity

3. **Update Dependencies**
   - Add availability service to DI
   - Handle user repository dependencies
   - Update availability interfaces

#### Outcomes:
- Complex availability logic isolated
- Easier to optimize availability checking
- Better testability for user assignment
- Improved round-robin fairness
- ~400 lines reduction

---

### **Phase 9: Extract Reschedule Service** - **Complexity: 9/10**
**Goal:** Extract the most complex piece - reschedule logic



#### Tasks:
1. **Create BookingRescheduleService**
   - Create `packages/features/bookings/lib/service/BookingRescheduleService.ts`
   - Extract reschedule logic from lines 1635-1933
   - Handle round-robin reschedule complexity
   - Manage organizer changes and calendar updates
   - Include reschedule-specific email flows
   - Handle original booking references

2. **Update BookingCreateService**
   - Replace inline reschedule logic with service call
   - Remove reschedule-specific code (900+ lines)
   - Maintain same external interface
   - Handle reschedule vs new booking routing

3. **Update BookingCreateFactory**
   - Add reschedule service to factory
   - Route reschedule requests to dedicated service
   - Maintain backwards compatibility

#### Success Metrics:
- All reschedule tests pass
- BookingCreateService reduced by ~900 lines
- No change in external API behavior
- Improved reschedule performance

---

## Final Architecture

### **After All Phases:**
- **BookingCreateService**: ~400 lines (orchestrator)
- **BookingRescheduleService**: ~900 lines (complex reschedule logic)
- **BookingAvailabilityService**: ~400 lines (user assignment & availability)
- **BookingEventManagerService**: ~300 lines (calendar integrations)
- **BookingNotificationService**: ~350 lines (emails & SMS)
- **BookingPaymentService**: ~200 lines (payment processing)
- **BookingValidationService**: ~300 lines (validation logic)
- **BookingWebhookService**: ~150 lines (webhook management)
- **Utilities**: ~200 lines (pure functions)

**Total**: ~3200 lines (vs original 2461) with much better organization

## Risk Mitigation

### Testing Strategy
- Comprehensive test suite for each extracted service
- Integration tests for service coordination
- Regression tests for external behavior
- Performance benchmarks for each phase

### Rollback Plan
- Each phase can be reverted independently
- Maintain git branches for each phase
- Preserve original interfaces throughout migration
- Keep comprehensive test coverage

### Quality Assurance
- Code reviews for each service extraction
- Performance monitoring during migration
- Automated testing pipeline validation
- Gradual rollout with monitoring

## Success Criteria
- All existing functionality preserved
- Improved code maintainability
- Better test coverage and isolation
- Reduced cognitive complexity
- Faster development velocity for booking features
- Easier debugging and error handling
- Better separation of concerns