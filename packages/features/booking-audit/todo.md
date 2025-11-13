# Booking Audit - TODO

## Pending Tasks

### 1. Add audit log for spam-blocked bookings (Early Return Path)
**Location**: `packages/features/bookings/lib/service/RegularBookingService.ts` (line ~1486)

**Issue**: When spam check blocks a booking and returns a decoy response, no audit log is created.

**Details**:
- Spam-blocked bookings return early with `isShortCircuitedBooking: true`
- These decoy bookings have `id: 0` and are never saved to the database
- No audit trail exists for these blocked attempts

**Considerations**:
- Should we create audit logs for bookings that never actually exist in the database?
- If yes, we need a special audit entry type (e.g., "BOOKING_BLOCKED_SPAM")
- Actor would be the blocked user (email/phone)
- Need to decide if this should be a security audit log vs booking audit log

**Recommendation**: Consider creating a separate security/spam audit log system rather than using booking audit for non-existent bookings.

---

### 2. Add audit log for seats booking early return
**Location**: `packages/features/bookings/lib/service/RegularBookingService.ts` (line ~1605)

**Issue**: When `handleSeats()` returns a booking (adding a new attendee to an existing seated event), the early return at line 1605 bypasses `onBookingCreated()`.

**Details**:
- Happens when adding attendees to existing seated bookings
- The function returns at line 1605 without calling `deps.bookingEventHandler.onBookingCreated()`
- Result: No audit log is created for the new booking/seat

**Solution**: 
- Add `onBookingCreated()` call before the return statement at line 1605
- Similar to the fix implemented for PENDING bookings (line 675)
- Should capture the booking creation even when it's a seat addition

**Priority**: High - This affects actual bookings that exist in the database

---

## Completed Tasks

### ✅ 1. Add audit log for PENDING bookings early return
**Fixed**: 2024 (PR/Commit TBD)
- Created `buildBookingCreatedPayload()` helper function (line 416) to avoid code duplication
- Added `onBookingCreatedPayload()` call at line 698 before early return using the helper
- Updated main booking creation path (line 2277) to also use the helper function
- Ensures audit logs are created when existing PENDING bookings are returned
- Handles both new and existing bookings in the PENDING state

