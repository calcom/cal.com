# Spam Booking Flow Review

## Complete Flow Analysis

### 1. User Submits Booking
**File:** `apps/web/pages/api/book/event.ts` → `handleNewBooking`

- User submits booking form
- Request includes: bookerEmail, bookerName, startTime, endTime, responses, etc.

### 2. Spam Detection
**File:** `packages/features/bookings/lib/handleNewBooking.ts` (lines 566-571)

```
const blockingResult = organizationId
  ? await watchlistFeature.orgBlocking.isEmailBlocked(bookerEmail, organizationId)
  : await watchlistFeature.globalBlocking.isBlocked(bookerEmail);
```

- Checks booker email against watchlist
- Checks both exact email match and domain match
- Uses `GlobalWatchlistRepository.findBlockedEmail/Domain` or `OrganizationWatchlistRepository.findBlockedEmail/Domain`

### 3. When Spam Detected
**File:** `packages/features/bookings/lib/handleNewBooking.ts` (lines 572-675)

**✅ IMPLEMENTED:**
- Creates BookingIntent with status=BLOCKED
- Stores full PII (email, phone, all booking details)
- Creates WatchlistEventAudit entry
- Links audit to BookingIntent via bookingIntentId
- Returns response with BookingIntent.id as uid

**Response Structure (line 662-675):**
```
return {
  uid: bookingIntent.id,  // Uses BookingIntent.id as uid
  id: bookingIntent.id,
  title, description, startTime, endTime, location,
  attendees, responses,
  user: { email: null, name: organizerName },
  ...
}
```

### 4. User Redirected to Success Page
**URL:** `/booking/{bookingIntent.id}`

User sees fake success message with booking details.

### 5. Viewing Booking Details
**File:** `apps/web/modules/bookings/views/bookings-single-view.getServerSideProps.tsx` (line 71)

```
const { bookingInfoRaw, bookingInfo } = await getBookingInfo(uid);
```

**Calls:** `getBookingInfo` → `getUserBooking` → `getBookingOrDecoyForViewing`

## 🚨 ISSUES FOUND

### Issue #1: Broken Import in getUserBooking.ts
**File:** `packages/features/bookings/lib/getUserBooking.ts`

```typescript
import { getBookingOrDecoyForViewing } from "./getBookingOrDecoy";  // ❌ FILE DOES NOT EXIST
```

**Should be:**
```typescript
import { getBookingOrIntentForViewing } from "./getBookingOrIntent";  // ✅ CORRECT
```

### Issue #2: Missing getByUidForViewing Method
**File:** `packages/lib/server/repository/PrismaBookingIntentRepository.ts`

The `getBookingOrIntentForViewing` function calls:
```typescript
const bookingIntent = await bookingIntentRepo.getByUidForViewing(uid);  // ❌ METHOD DOES NOT EXIST
```

But `PrismaBookingIntentRepository` only has:
- `getById(id)` - queries by id field
- `getByIdForViewing(id)` - queries by id field

**Missing:** `getByUidForViewing(uid)` method

However, looking at the schema, BookingIntent doesn't have a `uid` field separate from `id`. The `id` field IS the UUID.

### Issue #3: Schema vs Implementation Mismatch
**Schema:** `packages/prisma/schema.prisma` (line 861)
```
model BookingIntent {
  id                 String              @id @default(uuid(7)) @db.Uuid
  idempotencyKey     String?             @unique
  ...
}
```

**Problem:** 
- BookingIntent uses `id` (UUID) as primary key
- No separate `uid` field exists
- But `getBookingOrIntentForViewing` expects to query by `uid`

### Issue #4: Return UID Format
**File:** `handleNewBooking.ts` (line 663)
```typescript
return {
  uid: bookingIntent.id,  // Returns UUID (e.g., "abc123")
  ...
}
```

**URL becomes:** `/booking/abc123`

But regular bookings use a shorter format uid. This might work, but needs verification.

## 🔧 FIXES NEEDED

### Fix #1: Update getUserBooking.ts
```typescript
// Change import
import { getBookingOrIntentForViewing } from "./getBookingOrIntent";

const getUserBooking = async (uid: string) => {
  return await getBookingOrIntentForViewing(uid);
};
```

### Fix #2A: Option 1 - Rename Method (Recommended)
Since BookingIntent.id IS the uid, rename the method:

**In PrismaBookingIntentRepository:**
```typescript
async getByUidForViewing(uid: string): Promise<BookingIntentForViewing | null> {
  // Use existing getByIdForViewing logic
  return this.getByIdForViewing(uid);
}
```

### Fix #2B: Option 2 - Update getBookingOrIntent to use getByIdForViewing
**In getBookingOrIntent.ts:**
```typescript
const bookingIntent = await bookingIntentRepo.getByIdForViewing(uid);
```

## ✅ WHAT WORKS CORRECTLY

1. **Spam Detection:** ✅ Properly checks email and domain
2. **BookingIntent Creation:** ✅ Creates with status=BLOCKED and full PII
3. **Audit Logging:** ✅ Creates WatchlistEventAudit and links to BookingIntent
4. **Response Transformation:** ✅ Returns fake success with BookingIntent.id as uid
5. **Status Masking:** ✅ `getBookingOrIntentForViewing` returns status as ACCEPTED (line 100)

## 🎯 RECOMMENDATION

**Priority 1:** Fix the broken import and add missing method
**Priority 2:** Add integration test to verify end-to-end flow
**Priority 3:** Verify URL format works correctly with UUID-based uid

## Test Case to Verify

1. Add email to watchlist with action=BLOCK
2. Submit booking with that email
3. Verify BookingIntent created with status=BLOCKED
4. Verify response returns bookingIntent.id as uid
5. Navigate to `/booking/{uid}`
6. Verify page loads and shows booking as "confirmed"
7. Verify admin can see BookingIntent with status=BLOCKED in database
