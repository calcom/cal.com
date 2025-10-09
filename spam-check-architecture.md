# Async Spam Check Architecture

## Overview
This document describes the async spam check feature implemented in commit `6de9b7337e788cf243bfce61fe11ed0717f434f3`.

## Flow Diagram

See **[spam-check-flow.mermaid](./spam-check-flow.mermaid)** for the complete flow visualization.

The diagram shows:
- ⚡ **Parallel execution**: Spam check runs simultaneously with availability loading (zero delay)
- 🔴 **Spammer path**: Fake booking generation and decoy success page
- 🟢 **Legitimate path**: Normal booking creation flow
- 📦 **New components**: SpamCheckService, DI container, /booking-successful page
- 📝 **Modified files**: handleNewBooking.ts, useBookings.ts

## Key Features

### 1. Parallel Execution (Zero Delay)
- Spam check starts immediately when `handleNewBooking` begins
- Runs in parallel with:
  - Availability loading
  - Event type processing
  - Booking limit checks
- Result is awaited only before booking creation
- **No performance impact** for legitimate users

### 2. Fake Booking Response
When spam is detected, generates a complete fake booking with:
- Fake UUID (v4)
- All required fields populated
- `isSpamDecoy: true` flag
- Realistic booking data

### 3. Decoy Success Page
- New route: `/booking-successful`
- Client-side page that reads from query params
- Shows convincing booking confirmation to spammers
- Includes all booking details (time, attendees, location)
- Uses same UI components as real success page

### 4. Dependency Injection
- `SpamCheckService` provided via DI container
- Follows existing DI patterns in the codebase
- Easy to test and mock

## Files Changed

### New Files
1. **`apps/web/app/(booking-page-wrapper)/booking-successful/page.tsx`** (82 lines)
   - Client-side success page for spam decoy bookings
   - Displays booking details from query parameters

2. **`packages/features/di/watchlist/containers/spamCheck.ts`** (9 lines)
   - DI container for SpamCheckService
   - Wires up dependencies

3. **`packages/features/watchlist/lib/service/SpamCheckService.ts`** (18 lines)
   - Core service managing async spam checks
   - Provides `startCheck()` and `waitForCheck()` methods

### Modified Files
1. **`packages/features/bookings/lib/handleNewBooking.ts`**
   - Starts spam check early in the flow
   - Awaits result before booking creation
   - Generates fake booking response for blocked emails
   - Imports SpamCheckService from DI container

2. **`packages/features/bookings/Booker/components/hooks/useBookings.ts`**
   - Detects `isSpamDecoy` flag in booking response
   - Redirects spam bookings to decoy page with query params
   - Fixed pre-existing lint warnings

## Benefits

✅ **Zero Performance Impact**: Spam check runs in parallel  
✅ **Spammer Deterrent**: Convincing fake success page  
✅ **Clean Architecture**: Uses DI and follows existing patterns  
✅ **Maintainable**: Service-oriented design  
✅ **Testable**: Easy to mock and test  
✅ **Non-Intrusive**: Minimal changes to existing code