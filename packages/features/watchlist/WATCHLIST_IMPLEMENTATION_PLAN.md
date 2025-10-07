# Watchlist & Spam Detection Implementation Plan

## Overview
This document outlines the implementation plan for the Cal.com watchlist and spam detection system, focusing on blocking malicious bookings while preserving evidence.

---

## Phase 1: BLOCK Action Flow (Current Focus) ✅

### Status: MOSTLY IMPLEMENTED ✅

### Database Models ✅
- **Watchlist** - Stores entries with EMAIL/DOMAIN/USERNAME types and BLOCK/REPORT/ALERT actions
- **WatchlistEventAudit** - Tracks when watchlist rules are triggered
- **BookingIntent** - Stores blocked booking attempts with full PII for admin review
- **BookingIntentStatus** enum - BLOCKED, PENDING

### Repositories ✅
#### GlobalWatchlistRepository
- ✅ `findBlockedEmail(email: string)` - Find global blocked emails
- ✅ `findBlockedDomain(domain: string)` - Find global blocked domains
- ✅ `findFreeEmailDomain(domain: string)` - Check if domain is free email provider

#### OrganizationWatchlistRepository
- ✅ `findBlockedEmail(email, orgId)` - Find org-specific blocked emails
- ✅ `findBlockedDomain(domain, orgId)` - Find org-specific blocked domains

#### PrismaAuditRepository
- ✅ `createEventAudit()` - Log watchlist trigger events
- ✅ `getBlockingStats()` - Get blocking statistics

#### PrismaBookingIntentRepository
- ✅ `create()` - Create BookingIntent with BLOCKED status
- ✅ `getById()` - Retrieve BookingIntent by ID

### Services ✅
#### GlobalBlockingService
- ✅ `isBlocked(email, orgId?)` - Check if email is globally blocked
- ✅ Returns `BlockingResult` with watchlist entry details

#### OrganizationBlockingService
- ✅ `isEmailBlocked(email, orgId)` - Check org-specific blocking
- ✅ `isDomainBlocked(domain, orgId)` - Check org-specific domain blocking

#### AuditService
- ✅ `logBlockedBookingAttempt()` - Log when spam is detected

### Controllers ✅
- ✅ `checkIfEmailIsBlockedInWatchlistController()` - Main email check endpoint
- ✅ `checkIfUsersAreBlocked()` - Check if event hosts are blocked

### Integration Points ✅

#### 1. Booking Flow (handleNewBooking.ts)
**Current Implementation:**
```typescript
// Line 566-570: Check watchlist before booking
const blockingResult = organizationId
  ? await watchlistFeature.orgBlocking.isEmailBlocked(bookerEmail, organizationId)
  : await watchlistFeature.globalBlocking.isBlocked(bookerEmail);

if (blockingResult.isBlocked) {
  // Line 601-613: Create BookingIntent with BLOCKED status
  const bookingIntent = await buildBookingIntent({
    eventTypeId,
    organizerUser,
    eventName: eventType.title,
    startTime: reqBody.start,
    endTime: reqBody.end,
    bookerName: fullNameForDecoy,
    bookerEmail,
    bookerPhoneNumber,
    location,
    responses: reqBody.responses,
    idempotencyKey,
  });

  // Line 616-642: Create audit entry and link to booking intent
  await auditService.logBlockedBookingAttempt({...});
  
  // Update WatchlistEventAudit with bookingIntentId
  await prisma.watchlistEventAudit.update({
    where: { id: recentAudit.id },
    data: { bookingIntentId: bookingIntent.id },
  });

  // Line 648-680: Return fake success response (decoy booking)
  // User sees "booking confirmed" but it's actually blocked
}
```

**Key Points:**
- ✅ BookingIntent is created directly as BLOCKED (not PENDING→BLOCKED)
- ✅ Full PII is stored (email, phone, all details)
- ✅ WatchlistEventAudit is created and linked via bookingIntentId
- ✅ User receives fake success response (decoy)

#### 2. Host Validation (loadAndValidateUsers.ts)
```typescript
// Line 133: Check if event hosts are blocked
const containsBlockedUser = await checkIfUsersAreBlocked(users);

if (containsBlockedUser) {
  throw new HttpError({ statusCode: 404, message: "eventTypeUser.notFound" });
}
```
**Purpose:** Prevents blocked users from hosting events

#### 3. Email Verification (verifyEmail.ts)
```typescript
// Line 46: Block spam emails from verifying
if (await checkIfEmailIsBlockedInWatchlistController(email)) {
  log.warn("Email is blocked - not sending verification email", email);
  return { ok: false, skipped: false };
}
```
**Purpose:** Prevents spam accounts from being created

### Flow Summary (BLOCK Action)

```
User submits booking
    ↓
handleNewBooking checks watchlist
    ↓
GlobalBlockingService.isBlocked(email)
    ↓
GlobalWatchlistRepository.findBlockedEmail/Domain
    ↓
[IF BLOCKED]
    ↓
buildBookingIntent(status: BLOCKED)
    ↓
PrismaBookingIntentRepository.create()
    ↓
AuditService.logBlockedBookingAttempt()
    ↓
PrismaAuditRepository.createEventAudit()
    ↓
Link WatchlistEventAudit → BookingIntent
    ↓
Return fake success response
    ↓
User sees "confirmed" but booking is blocked
```

---

## Phase 2: REPORT Action Flow (Future)

### Status: NOT IMPLEMENTED ❌

### What Needs to Be Done

#### 1. Repository Methods (Missing)
```typescript
// GlobalWatchlistRepository
- findReportedEmail(email: string)
- findReportedDomain(domain: string)

// OrganizationWatchlistRepository  
- findReportedEmail(email, orgId) ✅ EXISTS
- findReportedDomain(domain, orgId) ✅ EXISTS
```

#### 2. Service Updates (Missing)
```typescript
// GlobalBlockingService
- isReported(email, orgId?)
  Returns: { isReported: boolean, watchlistEntry?: Watchlist }

// OrganizationBlockingService
- isEmailReported(email, orgId) ⚠️ EXISTS BUT UNUSED
```

#### 3. Integration in handleNewBooking (Missing)
```typescript
// After BLOCK check, check for REPORT
const reportResult = organizationId
  ? await watchlistFeature.orgBlocking.isEmailReported(bookerEmail, organizationId)
  : await watchlistFeature.globalBlocking.isReported(bookerEmail);

if (reportResult.isReported) {
  // Allow booking to proceed normally
  // But create audit entry
  await auditService.logReportedBookingAttempt({
    email: bookerEmail,
    organizationId,
    watchlistId: reportResult.watchlistEntry.id,
    eventTypeId,
  });
  // Continue with normal booking flow
}
```

#### 4. Audit Service Method (Missing)
```typescript
async logReportedBookingAttempt(data: {
  email: string;
  organizationId?: number;
  watchlistId: string;
  eventTypeId: number;
}): Promise<void> {
  await this.auditRepository.createEventAudit({
    watchlistId: data.watchlistId,
    eventTypeId: data.eventTypeId,
    actionTaken: "REPORT",
  });
}
```

### REPORT Flow Summary
```
User submits booking
    ↓
Check for REPORT action entries
    ↓
[IF REPORTED]
    ↓
Create WatchlistEventAudit (action: REPORT)
    ↓
Allow booking to proceed normally
    ↓
Admin can review reported bookings later
```

---

## Phase 3: ALERT Action Flow (Future)

### Status: NOT IMPLEMENTED ❌

### What Needs to Be Done

#### 1. Repository Methods (Missing)
```typescript
// GlobalWatchlistRepository
- findAlertEmail(email: string)
- findAlertDomain(domain: string)

// OrganizationWatchlistRepository
- findAlertEmail(email, orgId)
- findAlertDomain(domain, orgId)
```

#### 2. Service Updates (Missing)
```typescript
// GlobalBlockingService
- shouldAlert(email, orgId?)
  Returns: { shouldAlert: boolean, watchlistEntry?: Watchlist }

// OrganizationBlockingService
- isEmailAlerted(email, orgId)
```

#### 3. Notification Handler (Missing)
```typescript
// New service or use existing WebhookNotificationHandler
class WatchlistNotificationService {
  async notifyAdmins(data: {
    email: string;
    eventTypeId: number;
    organizationId?: number;
    bookingDetails: BookingData;
  }): Promise<void> {
    // Send email/webhook to admins
    // Could integrate with existing webhook system
  }
}
```

#### 4. Integration in handleNewBooking (Missing)
```typescript
// After BLOCK and REPORT checks
const alertResult = organizationId
  ? await watchlistFeature.orgBlocking.isEmailAlerted(bookerEmail, organizationId)
  : await watchlistFeature.globalBlocking.shouldAlert(bookerEmail);

if (alertResult.shouldAlert) {
  // Create audit entry
  await auditService.logAlertTriggered({
    email: bookerEmail,
    organizationId,
    watchlistId: alertResult.watchlistEntry.id,
    eventTypeId,
  });
  
  // Send notification to admins
  await watchlistNotificationService.notifyAdmins({
    email: bookerEmail,
    eventTypeId,
    organizationId,
    bookingDetails: reqBody,
  });
  
  // Continue with normal booking flow
}
```

### ALERT Flow Summary
```
User submits booking
    ↓
Check for ALERT action entries
    ↓
[IF ALERTED]
    ↓
Create WatchlistEventAudit (action: ALERT)
    ↓
Send real-time notification to admins
    ↓
Allow booking to proceed normally
    ↓
Admin can review and take action if needed
```

---

## Phase 4: Admin UI & Management (Future)

### Status: NOT PLANNED YET

### Features Needed
- View all BookingIntent records (blocked bookings)
- View WatchlistEventAudit logs (all actions)
- Manage watchlist entries (add/edit/delete)
- Unblock legitimate bookings
- Export audit logs
- Statistics dashboard

---

## Testing Strategy

### Unit Tests Needed
- [ ] GlobalWatchlistRepository methods
- [ ] OrganizationWatchlistRepository methods
- [ ] BlockingService methods
- [ ] AuditService methods
- [ ] buildBookingIntent function

### Integration Tests Needed
- [ ] End-to-end BLOCK flow
- [ ] End-to-end REPORT flow (future)
- [ ] End-to-end ALERT flow (future)
- [ ] Email verification blocking
- [ ] Host blocking

### Test Cases
1. ✅ Blocked email submits booking → BookingIntent created, fake success
2. ✅ Blocked domain submits booking → Same as #1
3. ✅ Free email domain detected → Appropriate action
4. ✅ Blocked user tries to verify email → Verification blocked
5. ✅ Blocked user tries to host event → Event creation blocked
6. [ ] Reported email submits booking → Booking succeeds, audit logged
7. [ ] Alerted email submits booking → Booking succeeds, admin notified

---

## Technical Decisions & Notes

### Why BookingIntent instead of regular Booking?
- Allows storing blocked attempts without cluttering main Booking table
- BLOCKED status clearly distinguishes from legitimate bookings
- Can be reviewed/unblocked by admins if needed
- Preserves full PII for investigation

### Why fake success response (decoy)?
- Prevents spammers from knowing they're blocked
- Forces them to think their spam is working
- Wastes their time and resources
- Makes it harder to find patterns around the blocking logic

### Why check booker but not all attendees?
- Main spammer is the person initiating the booking
- Attendees (guests) might be legitimate emails being spammed
- Focuses blocking on the actual bad actor

### Why three actions (BLOCK/REPORT/ALERT)?
- **BLOCK**: High-confidence spam → Silent blocking
- **REPORT**: Suspicious but not certain → Allow but log for review
- **ALERT**: Needs immediate attention → Notify admins in real-time

---

## Migration Path

### Already Migrated ✅
- `DecoyBooking` → `BookingIntent` (20251007090514)
- Added `BookingIntentStatus` enum
- Added `bookingIntentId` to `WatchlistEventAudit`

### Future Migrations Needed
- None for Phase 1 (BLOCK flow)
- Possible admin UI tables in Phase 4

---

## Current Priorities

1. ✅ **DONE:** Update diagram to match actual implementation
2. ✅ **DONE:** Document current BLOCK flow
3. **NEXT:** Write tests for BLOCK flow
4. **NEXT:** Verify all BLOCK flow edge cases work
5. **LATER:** Implement REPORT flow (Phase 2)
6. **LATER:** Implement ALERT flow (Phase 3)
7. **LATER:** Build admin UI (Phase 4)

---

## Questions & Decisions Needed

1. Should REPORT/ALERT be implemented for global watchlist or just org-specific?
2. What notification method for ALERT? (Email? Webhook? Both?)
3. Should BookingIntent records be auto-deleted after X days?
4. How should admins unblock false positives?
5. Should there be rate limiting on watchlist checks?

---

## Files Modified

### Implemented (Phase 1)
- `packages/prisma/schema.prisma` - Models defined
- `packages/features/watchlist/lib/repository/GlobalWatchlistRepository.ts`
- `packages/features/watchlist/lib/repository/OrganizationWatchlistRepository.ts`
- `packages/features/watchlist/lib/repository/PrismaAuditRepository.ts`
- `packages/lib/server/repository/PrismaBookingIntentRepository.ts`
- `packages/features/watchlist/lib/service/GlobalBlockingService.ts`
- `packages/features/watchlist/lib/service/OrganizationBlockingService.ts`
- `packages/features/watchlist/lib/service/AuditService.ts`
- `packages/features/bookings/lib/handleNewBooking.ts` - Main integration
- `packages/features/bookings/lib/handleNewBooking/loadAndValidateUsers.ts`
- `packages/features/auth/lib/verifyEmail.ts`
- `packages/features/watchlist/watchlist-booking-flow.mermaid` - Diagram

### To Be Modified (Phase 2 & 3)
- All Phase 1 files (add REPORT/ALERT support)
- New notification service files
- Admin UI components (new)

---

## Diagram Location
- Booking flow: `packages/features/watchlist/watchlist-booking-flow.mermaid`
- CRUD operations: `packages/features/watchlist/watchlist-crud.mermaid`
