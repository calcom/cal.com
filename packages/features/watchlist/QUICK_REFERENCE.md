# Watchlist Feature - Quick Reference

**Last Updated**: October 12, 2025  
**TL;DR**: Email/domain/username blocking with global and org-scoped support  
**Test Coverage**: 92 tests, ~80% coverage, all passing

---

## Quick Start

### Check if Email is Blocked

```typescript
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";

const isBlocked = await checkIfEmailIsBlockedInWatchlistController({
  email: "user@example.com",
  organizationId: 123, // Optional: check org-specific entries
  span: sentrySpan,     // Optional: telemetry
});
```

### Check Multiple Users

```typescript
import { checkIfUsersAreBlocked } from "@calcom/features/watchlist/operations/check-if-users-are-blocked.controller";

const containsBlockedUser = await checkIfUsersAreBlocked({
  users: [
    { email: "user1@example.com", username: "user1", locked: false },
    { email: "user2@example.com", username: "user2", locked: false },
  ],
  organizationId: 123,
  span: sentrySpan,
});
```

### Create Watchlist Entry (Global)

```typescript
import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

const watchlist = await getWatchlistFeature();
const entry = await watchlist.watchlist.createEntry({
  type: "EMAIL",           // EMAIL, DOMAIN, or USERNAME
  value: "spam@example.com",
  action: "BLOCK",         // BLOCK, REPORT, or ALERT
  isGlobal: true,          // Global (system-wide)
  description: "Spam account",
});
```

### Create Watchlist Entry (Organization)

```typescript
const entry = await watchlist.watchlist.createEntry({
  type: "DOMAIN",
  value: "competitor.com",
  action: "BLOCK",
  isGlobal: false,
  organizationId: 123,     // Required for org-scoped entries
  description: "Competitor domain",
});
```

### List All System Entries (Admin Only)

```typescript
import { listAllSystemEntriesController } from "@calcom/features/watchlist/operations/list-all-system-entries.controller";

const allEntries = await listAllSystemEntriesController();
// Returns ALL entries: global + all organization-specific
```

---

## Key Types

### WatchlistType
- `EMAIL` - Individual email address
- `DOMAIN` - Email domain (e.g., "example.com")
- `USERNAME` - Username

### WatchlistAction
- `BLOCK` - Prevent action (registration, booking, etc.)
- `REPORT` - Log only, don't block
- `ALERT` - Notify admins

### WatchlistSource
- `MANUAL` - Manually added by admin
- `FREE_DOMAIN_POLICY` - Auto-added (e.g., Gmail, Yahoo)

---

## Architecture at a Glance

```
Controllers (Public API)
    ↓
Facade (Composition Root)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access)
    ↓
Database (Prisma)
```

### Services

1. **WatchlistService** - CRUD operations
2. **GlobalBlockingService** - Check global blocklist
3. **OrganizationBlockingService** - Check org-specific blocklist
4. **WatchlistAuditService** - Audit logging

### Repositories

1. **GlobalWatchlistRepository** - Global entries (organizationId = null)
2. **OrganizationWatchlistRepository** - Org entries (organizationId != null)
3. **PrismaWatchlistAuditRepository** - Audit trail

---

## Database Schema (Simplified)

```prisma
model Watchlist {
  id             String          @id @default(uuid())
  type           WatchlistType   // EMAIL, DOMAIN, USERNAME
  value          String          // Normalized
  action         WatchlistAction // BLOCK, REPORT, ALERT
  source         WatchlistSource // MANUAL, FREE_DOMAIN_POLICY
  isGlobal       Boolean
  organizationId Int?
  description    String?
  lastUpdatedAt  DateTime

  @@unique([type, value, organizationId])
  @@index([type, value, organizationId, action])
}
```

---

## Integration Points

### 1. User Registration
```typescript
// packages/lib/server/service/userCreationService.ts
const locked = await checkIfEmailIsBlockedInWatchlistController({
  email,
  organizationId: data.organizationId ?? undefined,
  span: sentrySpan,
});

await userRepo.create({ ...data, locked });
```

### 2. Email Verification
```typescript
// packages/features/auth/lib/verifyEmail.ts
const isBlocked = await checkIfEmailIsBlockedInWatchlistController({
  email,
  organizationId: null,
  span: sentrySpan,
});

if (isBlocked) {
  return { error: "Email not allowed" };
}
```

### 3. Booking Creation
```typescript
// packages/features/bookings/lib/handleNewBooking/loadAndValidateUsers.ts
const containsBlockedUser = await checkIfUsersAreBlocked({
  users: usersWithCredentials,
  organizationId,
  span: sentrySpan,
});

if (containsBlockedUser) {
  throw new Error("Blocked user detected");
}
```

---

## Testing

### Mock Repositories (Unit Tests)

```typescript
import { vi } from "vitest";
import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";

const mockGlobalRepo: IGlobalWatchlistRepository = {
  findBlockedEmail: vi.fn(),
  findBlockedDomain: vi.fn(),
  createEntry: vi.fn(),
  // ... other methods
};

const service = new WatchlistService({
  globalRepo: mockGlobalRepo,
  orgRepo: mockOrgRepo,
  logger: mockLogger,
});
```

### Mock Controllers

```typescript
vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));

// Override in test:
vi.mocked(checkIfEmailIsBlockedInWatchlistController).mockResolvedValue(true);
```

---

## Performance

### Indexes
- ✅ `@@unique([type, value, organizationId])` - Prevents duplicates
- ✅ `@@index([type, value, organizationId, action])` - Optimized lookups

### Query Optimization
- ✅ Explicit field selection (`select: this.selectFields`)
- ✅ Parallel queries with `Promise.all`
- ✅ No try/catch in repositories (return promises directly)

---

## Common Pitfalls

### ❌ Don't normalize in repositories
```typescript
// ❌ BAD
async findBlockedEmail(email: string) {
  const normalized = normalizeEmail(email); // Wrong layer!
  return prisma.watchlist.findFirst({ where: { value: normalized } });
}

// ✅ GOOD - normalize in service layer
async createEntry(data) {
  const normalized = normalizeEmail(data.value); // Service layer
  return this.globalRepo.createEntry({ ...data, value: normalized });
}
```

### ❌ Don't pass prisma to services
```typescript
// ❌ BAD
constructor(private readonly prisma: PrismaClient) {}

// ✅ GOOD - inject repositories
constructor(private readonly deps: { globalRepo: IGlobalWatchlistRepository }) {}
```

### ❌ Don't use prismock in tests
```typescript
// ❌ BAD - blocks Prisma upgrades
import prismock from "prismock";

// ✅ GOOD - mock repositories
const mockRepo = { findBlockedEmail: vi.fn() };
```

---

## File Locations

### Controllers (Public API)
- `packages/features/watchlist/operations/check-if-email-in-watchlist.controller.ts`
- `packages/features/watchlist/operations/check-if-users-are-blocked.controller.ts`
- `packages/features/watchlist/operations/list-all-system-entries.controller.ts`

### Services
- `packages/features/watchlist/lib/service/WatchlistService.ts`
- `packages/features/watchlist/lib/service/GlobalBlockingService.ts`
- `packages/features/watchlist/lib/service/OrganizationBlockingService.ts`
- `packages/features/watchlist/lib/service/WatchlistAuditService.ts`

### Repositories
- `packages/features/watchlist/lib/repository/GlobalWatchlistRepository.ts`
- `packages/features/watchlist/lib/repository/OrganizationWatchlistRepository.ts`
- `packages/features/watchlist/lib/repository/PrismaWatchlistAuditRepository.ts`

### DI Container
- `packages/features/di/watchlist/containers/watchlist.ts`
- `packages/features/di/watchlist/Watchlist.tokens.ts`

### Types
- `packages/features/watchlist/lib/types.ts` - Domain types
- `packages/features/watchlist/lib/dto/types.ts` - API DTOs
- `packages/features/watchlist/lib/interface/` - Service interfaces

---

## Important Implementation Details

### **Normalization (Simplified, No PSL)**

```typescript
// Domains stored AS-IS with @ prefix (no subdomain stripping)
normalizeDomain("example.com")      → "@example.com"
normalizeDomain("mail.google.com")  → "@mail.google.com"
normalizeDomain("example.co.uk")    → "@example.co.uk"

// Perfect for email domain blocking!
// Block @competitor.com → blocks all *@competitor.com emails
```

**Why?** No Public Suffix List needed, no multi-level TLD issues (`.co.uk`, `.com.au`). Email domains rarely use subdomains anyway!

### **Dependency Injection Pattern**

```typescript
// Services use Deps pattern for easy maintenance
type Deps = {
  globalRepo: IGlobalWatchlistRepository;
  orgRepo: IOrganizationWatchlistRepository;
  logger: Logger;
};

class WatchlistService {
  constructor(private readonly deps: Deps) {}
}

// Allows adding optional deps without breaking callers
```

### **Injectable Telemetry**

```typescript
// Controllers accept optional span for lazy Sentry loading
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";

await checkIfEmailIsBlockedInWatchlistController({
  email: "user@example.com",
  span: sentrySpan, // Optional - tests can omit or use noOpSpan
});
```

---

## Test Coverage

**92 tests across 8 files, ~1 second runtime**

```bash
# Run all watchlist tests
yarn test packages/features/watchlist --run

# Run specific test file
yarn test packages/features/watchlist/lib/service/WatchlistService.test.ts
```

**Test Files:**
- Controllers: 40 tests (public API, error handling)
- Services: 30 tests (business logic, normalization)
- Utils: 22 tests (normalization, free email check)

**All tests are unit tests** (no database required) - repositories are mocked for fast, isolated testing.

---

## For More Details

See: `packages/features/watchlist/ARCHITECTURE_SNAPSHOT.md`

