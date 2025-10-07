# Watchlist Implementation Plan

## Phase 1: BLOCK Action Flow (Current Focus)

### 1. Database Schema
- ✅ Watchlist model with action field (BLOCK, REPORT, ALERT)
- ✅ WatchlistEventAudit model to log when rules trigger
- ✅ BookingIntent model to store blocked booking attempts with full PII
- ✅ BookingIntentStatus enum (BLOCKED, PENDING)

### 2. Repository Layer
- ✅ GlobalWatchlistRepository: findBlockedEmail, findBlockedDomain
- ✅ OrganizationWatchlistRepository: findBlockedEmail, findBlockedDomain
- ✅ PrismaAuditRepository: createEventAudit to log triggers
- ✅ PrismaBookingIntentRepository: create BookingIntent records

### 3. Service Layer
- ✅ GlobalBlockingService: checks global watchlist for blocked entries
- ✅ OrganizationBlockingService: checks org-specific watchlist for blocked entries
- ✅ AuditService: logs blocked booking attempts with watchlist details

### 4. Booking Flow Integration
- ✅ Email verification flow blocks users with BLOCK action
- ✅ loadAndValidateUsers checks if event hosts are blocked
- ✅ handleNewBooking checks booker email against watchlist
- ✅ When BLOCK match found: create BookingIntent with status=BLOCKED
- ✅ Link WatchlistEventAudit to BookingIntent via bookingIntentId
- ✅ Return fake success response to user (decoy booking)

### 5. Current Gaps to Address

#### 5.1 Diagram Updates
- Update diagram to show BookingIntent created as BLOCKED (not PENDING→BLOCKED)
- Clarify that only booker email is checked in booking flow (hosts checked separately)
- Remove references to REPORT/ALERT flows for now

#### 5.2 Testing
- Add unit tests for BLOCK action in GlobalBlockingService
- Add unit tests for BLOCK action in OrganizationBlockingService
- Add integration tests for blocked booking flow
- Test BookingIntent creation and audit linking
- Test decoy booking response

#### 5.3 Fixes Applied
- ✅ Fixed broken import in getUserBooking.ts (getBookingOrDecoy → getBookingOrIntent)
- ✅ Updated getBookingOrIntentForViewing to use getByIdForViewing instead of non-existent getByUidForViewing
- ✅ BookingIntent.id (UUID) is used as uid when returning fake success response
- ✅ Added iCalUID field to BookingIntent response for compatibility

### 5.4 Documentation
- Document what data is stored in BookingIntent
- Document admin review process for blocked bookings
- Add comments explaining decoy booking strategy

---

## Phase 2: REPORT Action Flow (Future)

### Goals
- Allow bookings to proceed normally
- Create WatchlistEventAudit entries for reporting
- Provide admin dashboard to review reported bookings
- No user-facing changes

### Required Changes
- Add findReportedEmail/findReportedDomain to repositories
- Update blocking services to return action type
- Modify handleNewBooking to allow booking when action=REPORT
- Create audit entry with actionTaken=REPORT

---

## Phase 3: ALERT Action Flow (Future)

### Goals
- Allow bookings to proceed normally
- Create WatchlistEventAudit entries
- Send real-time notifications to administrators
- No user-facing changes

### Required Changes
- Add findAlertEmail/findAlertDomain to repositories
- Implement notification service for admins
- Modify handleNewBooking to allow booking when action=ALERT
- Create audit entry with actionTaken=ALERT
- Trigger admin notification with booking details

---

## Notes
- BLOCK action creates decoy booking - user sees success but booking is stored as BLOCKED
- All watchlist checks include both email and domain matching
- Email normalization is applied before all checks
- Audit entries track every watchlist trigger for analytics and review
