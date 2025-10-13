# Watchlist Feature - Architecture Snapshot

**Date**: October 12, 2025  
**Last Updated**: After test improvements and normalization simplification  
**Purpose**: Reference document for building UI and extending the watchlist feature

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Core Types & Interfaces](#core-types--interfaces)
5. [Services & Repositories](#services--repositories)
6. [Controllers (Public API)](#controllers-public-api)
7. [Dependency Injection](#dependency-injection)
8. [Integration Points](#integration-points)
9. [Testing Patterns](#testing-patterns)
10. [Performance & Indexes](#performance--indexes)
11. [Directory Structure](#directory-structure)

---

## Overview

The Watchlist feature provides email/domain/username blocking capabilities with support for both **global** (system-wide) and **organization-scoped** entries.

### Key Features
- ✅ Block emails, domains, or usernames
- ✅ Global vs. Organization-scoped blocking
- ✅ Multiple action types: `BLOCK`, `REPORT`, `ALERT`
- ✅ Multiple sources: `MANUAL`, `FREE_DOMAIN_POLICY`
- ✅ Audit trail for all blocking decisions
- ✅ System admin can view all entries across organizations
- ✅ Full dependency injection architecture with Deps pattern
- ✅ Explicit field selection for performance
- ✅ Normalization at service layer (simplified, no PSL required)
- ✅ Comprehensive test suite (92 tests, ~80% coverage)
- ✅ Injectable telemetry (lazy Sentry loading)

### Use Cases
1. **User Registration**: Check if email is blocked before creating user
2. **Booking Creation**: Check if booker/attendee emails are blocked
3. **Email Verification**: Check email against watchlist during verification
4. **Organization Management**: Block specific emails/domains per organization
5. **System Administration**: Manage global blocklist and view all entries

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CONTROLLERS                          │
│  (Public API - Auth, Validation, Orchestration)         │
│  - check-if-email-in-watchlist.controller.ts            │
│  - check-if-users-are-blocked.controller.ts             │
│  - list-all-system-entries.controller.ts                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  FEATURE FACADE                         │
│  (Composition Root - Wires Services Together)           │
│  - WatchlistFeature.ts                                  │
│  - getWatchlistFeature()                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVICES                             │
│  (Business Logic - Normalization, Validation)           │
│  - WatchlistService (CRUD)                              │
│  - GlobalBlockingService (Global checks)                │
│  - OrganizationBlockingService (Org checks)             │
│  - WatchlistAuditService (Audit logging)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  REPOSITORIES                           │
│  (Data Access - Prisma queries, No business logic)      │
│  - GlobalWatchlistRepository                            │
│  - OrganizationWatchlistRepository                      │
│  - PrismaWatchlistAuditRepository                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   DATABASE                              │
│  - Watchlist (Prisma model)                             │
│  - WatchlistAudit (Prisma model)                        │
│  - WatchlistEventAudit (Prisma model)                   │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Dependency Injection**: All dependencies injected via constructor
2. **Repository Pattern**: Data access abstracted behind interfaces
3. **Single Responsibility**: Each service has one clear purpose
4. **Normalization at Service Layer**: Emails/domains normalized before hitting repository
5. **Explicit Field Selection**: All Prisma queries use explicit `select` for performance
6. **Testability**: Services can be tested with mocked repositories

---

## Database Schema

### Watchlist Table

```prisma
model Watchlist {
  id             String          @id @default(uuid()) @db.Uuid
  type           WatchlistType   // EMAIL, DOMAIN, USERNAME
  value          String          // Normalized value
  description    String?
  isGlobal       Boolean         @default(false)
  organizationId Int?
  action         WatchlistAction @default(REPORT) // REPORT, BLOCK, ALERT
  source         WatchlistSource @default(MANUAL) // MANUAL, FREE_DOMAIN_POLICY
  lastUpdatedAt  DateTime        @default(now())

  @@unique([type, value, organizationId])
  @@index([type, value, organizationId, action])
}
```

### WatchlistAudit Table

```prisma
model WatchlistAudit {
  id              String          @id @default(uuid(7)) @db.Uuid
  type            WatchlistType
  value           String
  description     String?
  action          WatchlistAction @default(REPORT)
  changedAt       DateTime        @default(now())
  changedByUserId Int?
  watchlistId     String          @db.Uuid

  @@index([watchlistId, changedAt])
}
```

### WatchlistEventAudit Table

```prisma
model WatchlistEventAudit {
  id          String          @id @default(uuid(7)) @db.Uuid
  watchlistId String          @db.Uuid
  eventTypeId Int
  actionTaken WatchlistAction
  timestamp   DateTime        @default(now())
}
```

### Enums

```typescript
enum WatchlistType {
  EMAIL    // Individual email address
  DOMAIN   // Email domain (e.g., "example.com")
  USERNAME // Username blocking
}

enum WatchlistAction {
  REPORT // Log only, don't block
  BLOCK  // Prevent action
  ALERT  // Notify admins
}

enum WatchlistSource {
  MANUAL              // Manually added by admin
  FREE_DOMAIN_POLICY  // Automatically added (e.g., free email domains)
}
```

---

## Core Types & Interfaces

### Domain Types (`packages/features/watchlist/lib/types.ts`)

```typescript
export interface Watchlist {
  id: string;
  type: WatchlistType;
  value: string;
  description?: string | null;
  isGlobal: boolean;
  organizationId?: number | null;
  action: WatchlistAction;
  source: WatchlistSource;
  lastUpdatedAt: Date;
}

export interface CreateWatchlistInput {
  type: WatchlistType;
  value: string;
  description?: string;
  isGlobal?: boolean;
  organizationId?: number;
  action: WatchlistAction;
  source?: WatchlistSource;
}

export interface UpdateWatchlistInput {
  type: WatchlistType; // Required to normalize value
  value?: string;
  description?: string;
  action?: WatchlistAction;
  source?: WatchlistSource;
}
```

### DTO Types (`packages/features/watchlist/lib/dto/types.ts`)

```typescript
export interface WatchlistEntryDTO {
  id: string;
  type: WatchlistType;
  value: string;
  description?: string | null;
  action: WatchlistAction;
  source: WatchlistSource;
  isGlobal: boolean;
  lastUpdatedAt: string;
  organizationId?: number | null;
  createdBy?: {
    id: number;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
  updatedBy?: {
    id: number;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface BlockingCheckResultDTO {
  isBlocked: boolean;
  reason?: WatchlistType;
  matchedEntry?: {
    id: string;
    type: WatchlistType;
    value: string;
    action: WatchlistAction;
  };
}
```

### Service Interfaces

```typescript
// IWatchlistService
export interface IWatchlistService {
  createEntry(data: CreateWatchlistEntryData): Promise<WatchlistEntry>;
  updateEntry(id: string, data: UpdateWatchlistEntryData): Promise<WatchlistEntry>;
  deleteEntry(id: string): Promise<void>;
  getEntry(id: string): Promise<WatchlistEntry | null>;
  listAllSystemEntries(): Promise<WatchlistEntry[]>;
}

// IBlockingService
export interface BlockingResult {
  isBlocked: boolean;
  reason?: WatchlistType;
  watchlistEntry?: Record<string, unknown> | null;
}

export interface IBlockingService {
  isBlocked(email: string, organizationId?: number | null): Promise<BlockingResult>;
}
```

---

## Services & Repositories

### 1. WatchlistService

**Purpose**: CRUD operations for watchlist entries

**Constructor Pattern**:
```typescript
type Deps = {
  globalRepo: IGlobalWatchlistRepository;
  orgRepo: IOrganizationWatchlistRepository;
  logger: ReturnType<typeof logger.getSubLogger>;
};

constructor(private readonly deps: Deps)
```

**Key Methods**:
- `createEntry(data)` - Creates global or org-scoped entry
- `updateEntry(id, data)` - Updates existing entry
- `deleteEntry(id)` - Deletes entry
- `getEntry(id)` - Retrieves single entry
- `listAllSystemEntries()` - System admin: all entries across all orgs

**Responsibilities**:
- ✅ Input validation
- ✅ Email/domain normalization (service layer)
- ✅ Routes to correct repository (global vs. org)
- ✅ Error handling

### 2. GlobalBlockingService

**Purpose**: Check if email/domain is in **global** blocklist

**Constructor Pattern**:
```typescript
type Deps = {
  globalRepo: IGlobalWatchlistRepository;
};
```

**Key Methods**:
- `isBlocked(email)` - Checks both email and domain in global blocklist
- `isFreeEmailDomain(domain)` - Checks if domain is a free email provider

**Note**: Only handles global entries (organizationId = null)

### 3. OrganizationBlockingService

**Purpose**: Check if email/domain is in **organization-specific** blocklist

**Constructor Pattern**:
```typescript
type Deps = {
  orgRepo: IOrganizationWatchlistRepository;
};
```

**Key Methods**:
- `isBlocked(email, organizationId)` - Checks both email and domain for specific org

**Note**: Only handles organization entries (organizationId != null)

### 4. WatchlistAuditService

**Purpose**: Log audit trail for blocking attempts

**Constructor Pattern**:
```typescript
type Deps = {
  auditRepository: IAuditRepository;
};
```

**Key Methods**:
- `createAuditLog(data)` - Creates audit entry
- `getAuditLogs(watchlistId)` - Retrieves audit history

---

### Repository Pattern

All repositories:
1. ✅ Constructor-inject `PrismaClient`
2. ✅ Use explicit field selection (`select: this.selectFields`)
3. ✅ Accept **normalized** values (no normalization in repo)
4. ✅ Return promises directly (no try/catch)
5. ✅ Use `Promise.all` for parallel queries

**Example**:
```typescript
export class GlobalWatchlistRepository implements IGlobalWatchlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private readonly selectFields = {
    id: true,
    type: true,
    value: true,
    description: true,
    isGlobal: true,
    organizationId: true,
    action: true,
    source: true,
    lastUpdatedAt: true,
  } as const;

  async findBlockedEmail(email: string): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({
      select: this.selectFields,
      where: {
        type: WatchlistType.EMAIL,
        value: email, // Already normalized by service
        action: WatchlistAction.BLOCK,
        organizationId: null,
        isGlobal: true,
      },
    });
  }
}
```

---

## Controllers (Public API)

Controllers are the **public API** for the watchlist feature. They handle:
- ✅ Parameter validation
- ✅ Orchestration of services
- ✅ Telemetry/tracing (injectable `span`)
- ✅ Response formatting

### 1. checkIfEmailIsBlockedInWatchlistController

**Location**: `packages/features/watchlist/operations/check-if-email-in-watchlist.controller.ts`

**Purpose**: Check if a single email is blocked (global or org-specific)

**Signature**:
```typescript
interface CheckEmailBlockedParams {
  email: string;
  organizationId?: number | null;
  span?: SpanFn; // Injectable telemetry
}

export async function checkIfEmailIsBlockedInWatchlistController(
  params: CheckEmailBlockedParams
): Promise<boolean>
```

**Usage**:
```typescript
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";

const isBlocked = await checkIfEmailIsBlockedInWatchlistController({
  email: "user@example.com",
  organizationId: 123, // Optional
  span: sentrySpan,     // Optional
});
```

**Flow**:
1. Normalize email
2. Check global blocklist
3. If organizationId provided, check org blocklist
4. Return boolean

---

### 2. checkIfUsersAreBlocked

**Location**: `packages/features/watchlist/operations/check-if-users-are-blocked.controller.ts`

**Purpose**: Check if **any** user in a list is blocked

**Signature**:
```typescript
interface CheckUsersBlockedParams {
  users: { email: string; username: string | null; locked: boolean }[];
  organizationId?: number;
  span?: SpanFn;
}

export async function checkIfUsersAreBlocked(
  params: CheckUsersBlockedParams
): Promise<boolean>
```

**Usage**:
```typescript
const containsBlockedUser = await checkIfUsersAreBlocked({
  users: [
    { email: "user1@example.com", username: "user1", locked: false },
    { email: "user2@example.com", username: "user2", locked: false },
  ],
  organizationId: 123,
  span: sentrySpan,
});
```

**Flow**:
1. Check if any user already locked (fast path)
2. For each user, check global blocklist
3. If organizationId provided, check org blocklist
4. Return `true` if **any** user is blocked

---

### 3. listAllSystemEntriesController

**Location**: `packages/features/watchlist/operations/list-all-system-entries.controller.ts`

**Purpose**: System admin endpoint to get **all** watchlist entries (global + all orgs)

**Signature**:
```typescript
export async function listAllSystemEntriesController(): Promise<WatchlistEntry[]>
```

**Usage**:
```typescript
const allEntries = await listAllSystemEntriesController();
// Returns: [
//   { id: "...", type: "EMAIL", isGlobal: true, organizationId: null, ... },
//   { id: "...", type: "DOMAIN", isGlobal: false, organizationId: 123, ... },
// ]
```

**Security**: Should be protected by system admin role check

---

## Dependency Injection

### DI Container Setup

**Location**: `packages/features/di/watchlist/`

**Structure**:
```
packages/features/di/watchlist/
├── Watchlist.tokens.ts           # DI token symbols
├── containers/
│   └── watchlist.ts              # Container setup & getters
└── modules/
    └── Watchlist.module.ts       # Repository bindings
```

### DI Tokens

```typescript
// packages/features/di/watchlist/Watchlist.tokens.ts
export const WATCHLIST_DI_TOKENS = {
  WATCHLIST_SERVICE: Symbol("WatchlistService"),
  GLOBAL_BLOCKING_SERVICE: Symbol("GlobalBlockingService"),
  ORGANIZATION_BLOCKING_SERVICE: Symbol("OrganizationBlockingService"),
  AUDIT_SERVICE: Symbol("WatchlistAuditService"),
  GLOBAL_WATCHLIST_REPOSITORY: Symbol("GlobalWatchlistRepository"),
  ORGANIZATION_WATCHLIST_REPOSITORY: Symbol("OrganizationWatchlistRepository"),
  AUDIT_REPOSITORY: Symbol("PrismaWatchlistAuditRepository"),
};
```

### Container & Facade

```typescript
// packages/features/di/watchlist/containers/watchlist.ts
export const watchlistContainer = createContainer();

// Load dependencies
prismaModuleLoader.loadModule(watchlistContainer);
watchlistContainer.load(SHARED_TOKENS.LOGGER, loggerServiceModule);
watchlistContainer.load(WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY, watchlistModule);
// ... other tokens

// Main facade getter
export async function getWatchlistFeature(): Promise<WatchlistFeature> {
  return createWatchlistFeature(watchlistContainer);
}
```

### Feature Facade

```typescript
// packages/features/watchlist/lib/facade/WatchlistFeature.ts
export interface WatchlistFeature {
  globalBlocking: GlobalBlockingService;
  orgBlocking: OrganizationBlockingService;
  watchlist: WatchlistService;
  audit: WatchlistAuditService;
}

export function createWatchlistFeature(container: Container): WatchlistFeature {
  const globalRepo = container.get<IGlobalWatchlistRepository>(
    WATCHLIST_DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY
  );
  const orgRepo = container.get<IOrganizationWatchlistRepository>(
    WATCHLIST_DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY
  );
  const auditRepo = container.get<IAuditRepository>(
    WATCHLIST_DI_TOKENS.AUDIT_REPOSITORY
  );
  
  const watchlistLogger = logger.getSubLogger({ prefix: ["[WatchlistService]"] });

  return {
    globalBlocking: new GlobalBlockingService({ globalRepo }),
    orgBlocking: new OrganizationBlockingService({ orgRepo }),
    watchlist: new WatchlistService({ globalRepo, orgRepo, logger: watchlistLogger }),
    audit: new WatchlistAuditService({ auditRepository: auditRepo }),
  };
}
```

---

## Integration Points

### 1. User Registration

**File**: `packages/lib/server/service/userCreationService.ts`

```typescript
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";

const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController({
  email,
  organizationId: data.organizationId ?? undefined,
  span: sentrySpan,
});

const user = await userRepo.create({
  ...data,
  locked: shouldLockByDefault, // Auto-lock if in watchlist
});
```

### 2. Email Verification

**File**: `packages/features/auth/lib/verifyEmail.ts`

```typescript
const isBlocked = await checkIfEmailIsBlockedInWatchlistController({
  email,
  organizationId: null,
  span: sentrySpan,
});

if (isBlocked) {
  return { error: "Email address is not allowed" };
}
```

### 3. Booking Creation

**File**: `packages/features/bookings/lib/handleNewBooking/loadAndValidateUsers.ts`

```typescript
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfUsersAreBlocked } from "@calcom/features/watchlist/operations/check-if-users-are-blocked.controller";

const containsBlockedUser = await checkIfUsersAreBlocked({
  users: usersWithCredentials.map((u) => ({
    email: u.email,
    username: u.username,
    locked: u.locked,
  })),
  organizationId,
  span: sentrySpan,
});

if (containsBlockedUser) {
  throw new Error("One or more users are blocked");
}
```

### 4. Signup Handler

**File**: `packages/features/auth/signup/handlers/calcomHandler.ts`

```typescript
const locked = await checkIfEmailIsBlockedInWatchlistController({
  email,
  organizationId: null,
  span: sentrySpan,
});

await UserCreationService.createUser({
  data: {
    email,
    username,
    locked, // User automatically locked if in watchlist
    // ...
  },
});
```

---

## Testing Patterns

### Unit Testing with Repository Mocks

**Pattern**: Mock repositories, not Prisma

```typescript
import { describe, test, expect, vi, beforeEach } from "vitest";
import { WatchlistService } from "./WatchlistService";
import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";

const mockGlobalRepo: IGlobalWatchlistRepository = {
  findBlockedEmail: vi.fn(),
  findBlockedDomain: vi.fn(),
  createEntry: vi.fn(),
  // ... other methods
};

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  // ... other methods
};

describe("WatchlistService", () => {
  let service: WatchlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WatchlistService({
      globalRepo: mockGlobalRepo,
      orgRepo: mockOrgRepo,
      logger: mockLogger,
    });
  });

  test("should create global entry", async () => {
    const mockEntry = {
      id: "123",
      type: "EMAIL",
      value: "test@example.com",
      // ...
    };
    
    vi.mocked(mockGlobalRepo.createEntry).mockResolvedValue(mockEntry);

    const result = await service.createEntry({
      type: "EMAIL",
      value: "test@example.com",
      isGlobal: true,
      action: "BLOCK",
    });

    expect(mockGlobalRepo.createEntry).toHaveBeenCalledWith({
      type: "EMAIL",
      value: "test@example.com", // Normalized
      action: "BLOCK",
      source: undefined,
    });
    expect(result).toEqual(mockEntry);
  });
});
```

### Controller Testing

```typescript
vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));

// In test:
vi.mocked(checkIfEmailIsBlockedInWatchlistController).mockResolvedValue(true);
```

### Integration Testing

For integration tests, use a real database (not prismock):
- Set up test database with `DATABASE_URL`
- Seed test data
- Run tests against real Prisma client
- Clean up after tests

---

## Performance & Indexes

### Current Indexes

```prisma
@@unique([type, value, organizationId])
@@index([type, value, organizationId, action])
```

### Query Patterns

1. **Global Blocking** (High Frequency):
   ```sql
   WHERE type = 'EMAIL' AND value = ? AND action = 'BLOCK' AND organizationId IS NULL
   ```

2. **Organization Blocking** (High Frequency):
   ```sql
   WHERE type = 'EMAIL' AND value = ? AND action = 'BLOCK' AND organizationId = ?
   ```

3. **Free Domain Check** (Medium Frequency):
   ```sql
   WHERE type = 'DOMAIN' AND value = ? AND source = 'FREE_DOMAIN_POLICY' AND organizationId IS NULL
   ```

### Performance Status

✅ **Current indexes are adequate** for expected load patterns  
⚠️ Consider additional indexes if:
- Global queries become a bottleneck
- Free domain checks become very frequent

See: `packages/features/watchlist/PERFORMANCE_INDEXES.md` for details

---

## Directory Structure

```
packages/features/watchlist/
├── lib/
│   ├── dto/
│   │   ├── types.ts                    # API DTOs
│   │   ├── mappers.ts                  # Domain ↔ DTO mappers
│   │   └── index.ts
│   ├── facade/
│   │   └── WatchlistFeature.ts         # Feature composition root
│   ├── freeEmailDomainCheck/
│   │   ├── checkIfFreeEmailDomain.ts   # Free email checker
│   │   ├── freeEmailDomains.ts         # List of free domains
│   │   └── checkIfFreeEmailDomain.test.ts
│   ├── interface/
│   │   ├── IAuditRepository.ts
│   │   ├── IAuditService.ts
│   │   ├── IBlockingService.ts
│   │   ├── IWatchlistRepositories.ts
│   │   └── IWatchlistService.ts
│   ├── repository/
│   │   ├── GlobalWatchlistRepository.ts
│   │   ├── OrganizationWatchlistRepository.ts
│   │   └── PrismaWatchlistAuditRepository.ts
│   ├── service/
│   │   ├── GlobalBlockingService.ts
│   │   ├── OrganizationBlockingService.ts
│   │   ├── WatchlistAuditService.ts
│   │   └── WatchlistService.ts
│   ├── telemetry/
│   │   ├── types.ts                    # SpanFn interface
│   │   ├── sentry-span.ts              # Sentry implementation
│   │   ├── no-op-span.ts               # No-op for tests
│   │   └── index.ts
│   ├── utils/
│   │   ├── normalization.ts            # Email/domain normalization
│   │   └── normalization.test.ts
│   ├── types.ts                        # Core domain types
│   └── testUtils.ts
├── operations/
│   ├── check-if-email-in-watchlist.controller.ts
│   ├── check-if-users-are-blocked.controller.ts
│   └── list-all-system-entries.controller.ts
├── ARCHITECTURE_SNAPSHOT.md            # This document
└── PERFORMANCE_INDEXES.md              # Performance analysis

packages/features/di/watchlist/
├── Watchlist.tokens.ts                 # DI tokens
├── containers/
│   └── watchlist.ts                    # Container setup
└── modules/
    └── Watchlist.module.ts             # Repository bindings
```

---

## Building the UI

### Recommended UI Components

1. **Watchlist Management Page** (System Admin)
   - List all entries (global + org-specific)
   - Filter by type, action, source, organization
   - Create new entry
   - Edit existing entry
   - Delete entry
   - Pagination

2. **Organization Watchlist Page** (Org Admin)
   - List org-specific entries only
   - Create org-specific entry
   - Edit/delete org entries
   - Cannot modify global entries

3. **Audit Log Viewer**
   - View blocking attempts
   - Filter by date, user, action
   - Export audit logs

### API Endpoints to Create

```typescript
// System Admin Endpoints
GET    /api/v1/admin/watchlist              // List all entries
POST   /api/v1/admin/watchlist              // Create entry
PATCH  /api/v1/admin/watchlist/:id          // Update entry
DELETE /api/v1/admin/watchlist/:id          // Delete entry

// Organization Admin Endpoints
GET    /api/v1/organizations/:orgId/watchlist
POST   /api/v1/organizations/:orgId/watchlist
PATCH  /api/v1/organizations/:orgId/watchlist/:id
DELETE /api/v1/organizations/:orgId/watchlist/:id

// Audit Endpoints
GET    /api/v1/admin/watchlist/:id/audit    // Get audit history
GET    /api/v1/watchlist/audit              // Get all audit logs
```

### Sample API Handler

```typescript
// apps/api/v1/pages/api/admin/watchlist/index.ts
import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if user is system admin
  if (!isSystemAdmin(req.user)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const watchlist = await getWatchlistFeature();

  if (req.method === "GET") {
    const entries = await watchlist.watchlist.listAllSystemEntries();
    return res.status(200).json({ entries });
  }

  if (req.method === "POST") {
    const { type, value, action, isGlobal, organizationId, description } = req.body;
    const entry = await watchlist.watchlist.createEntry({
      type,
      value,
      action,
      isGlobal,
      organizationId,
      description,
    });
    return res.status(201).json({ entry });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

### UI State Management

```typescript
// Example: React Query hook for watchlist entries
export function useWatchlistEntries() {
  return useQuery({
    queryKey: ["watchlist", "entries"],
    queryFn: async () => {
      const response = await fetch("/api/v1/admin/watchlist");
      return response.json();
    },
  });
}

export function useCreateWatchlistEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateWatchlistEntryDTO) => {
      const response = await fetch("/api/v1/admin/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["watchlist", "entries"]);
    },
  });
}
```

---

## Key Architectural Decisions

### 1. Separate Global and Org Services
- **Why**: Clear separation of concerns, prevents accidental cross-contamination
- **Benefit**: Global blocking doesn't need organizationId, simpler API

### 2. Normalization at Service Layer
- **Why**: Business logic belongs in services, not repositories
- **Benefit**: Repositories are pure data access, easier to test

### 3. Explicit Field Selection
- **Why**: Performance and security (prevent accidental data leaks)
- **Benefit**: Queries return only necessary fields

### 4. Constructor Deps Pattern
- **Why**: Homogeneous style, easy to add optional dependencies
- **Benefit**: Clear dependency visibility, easier refactoring

### 5. Injectable Telemetry (span)
- **Why**: Lazy loading of Sentry, better testability
- **Benefit**: Tests don't load Sentry SDK, faster test runs

### 6. Repository Mocking over Prismock
- **Why**: Prismock prevents Prisma upgrades
- **Benefit**: Can upgrade Prisma without test breakage

---

## Common Patterns

### Pattern 1: Creating a Global Entry

```typescript
const watchlist = await getWatchlistFeature();
const entry = await watchlist.watchlist.createEntry({
  type: "EMAIL",
  value: "spam@example.com",
  action: "BLOCK",
  isGlobal: true,
  source: "MANUAL",
  description: "Spam account",
});
```

### Pattern 2: Creating an Org Entry

```typescript
const entry = await watchlist.watchlist.createEntry({
  type: "DOMAIN",
  value: "competitor.com",
  action: "BLOCK",
  isGlobal: false,
  organizationId: 123,
  description: "Competitor domain",
});
```

### Pattern 3: Checking if Email is Blocked

```typescript
const isBlocked = await checkIfEmailIsBlockedInWatchlistController({
  email: "user@example.com",
  organizationId: 123, // Optional
  span: sentrySpan,     // Optional
});

if (isBlocked) {
  // Handle blocked user
}
```

### Pattern 4: Batch Checking Users

```typescript
const containsBlockedUser = await checkIfUsersAreBlocked({
  users: [
    { email: "user1@example.com", username: "user1", locked: false },
    { email: "user2@example.com", username: "user2", locked: false },
  ],
  organizationId: 123,
});
```

---

## Next Steps for UI Development

1. **Create API Routes**
   - System admin routes
   - Organization admin routes
   - Audit routes

2. **Build UI Components**
   - Watchlist table with filters
   - Create/edit entry modal
   - Confirmation dialogs
   - Audit log viewer

3. **Add Role Guards**
   - System admin check
   - Organization admin check
   - Permission validation

4. **Implement Search & Filters**
   - Filter by type, action, source
   - Search by value
   - Organization filter

5. **Add Pagination**
   - Handle large result sets
   - Cursor or offset pagination

6. **Build Audit Trail UI**
   - Timeline view
   - Filter by date range
   - Export functionality

---

## Test Coverage

### **Comprehensive Test Suite: 92 Tests**

```
✓ Controllers (40 tests) - Public API, telemetry, error handling
  ✓ check-if-email-in-watchlist.controller.test.ts (14)
  ✓ check-if-users-are-blocked.controller.test.ts (16)
  ✓ list-all-system-entries.controller.test.ts (10)

✓ Services (30 tests) - Business logic, normalization, validation
  ✓ GlobalBlockingService.test.ts (10)
  ✓ OrganizationBlockingService.test.ts (7)
  ✓ WatchlistService.test.ts (13)

✓ Utils (22 tests) - Normalization, free email check
  ✓ normalization.test.ts (17)
  ✓ checkIfFreeEmailDomain.test.ts (5)

──────────────────────────────────────
Test Files  8 passed (8)
     Tests  92 passed (92)
Duration  ~1s
```

### **Testing Strategy**

**Unit Tests (All Tests)**
- ✅ Services with mocked repositories
- ✅ Controllers with mocked services
- ✅ Utils with pure logic
- ✅ No database required (repository mocking)
- ✅ Fast test suite (~1 second)

**Key Test Improvements:**
- ✅ Type-safe mocks using `Partial<>`
- ✅ Error propagation tests
- ✅ Removed redundant tests
- ✅ Repository mocking instead of prismock

### **Coverage**

**What's Tested:**
- ✅ All business logic (services)
- ✅ All public APIs (controllers)
- ✅ Email/domain normalization
- ✅ Multi-level TLD handling
- ✅ Telemetry injection
- ✅ Error propagation
- ✅ Parallel execution
- ✅ Early exit optimizations

**What's NOT Tested (Intentionally):**
- ❌ Repository layer (requires test database)
- ❌ Prisma queries (thin data access layer)
- ❌ End-to-end flows (covered by integration tests elsewhere)

**Rationale:** Repository tests require real database setup. Current unit tests with mocked repositories provide ~80% coverage of business logic, which is sufficient for this PR.

---

## Normalization Strategy

### **Simplified Approach (No PSL Required)**

**Philosophy:** Store domains AS-IS with `@` prefix, no subdomain stripping.

```typescript
// Always stored exactly as entered:
normalizeDomain("mail.google.com")    → "@mail.google.com"
normalizeDomain("example.co.uk")      → "@example.co.uk"
normalizeDomain("mail.example.co.uk") → "@mail.example.co.uk"
```

**Benefits:**
- ✅ No Public Suffix List dependency
- ✅ No multi-level TLD issues (`.co.uk`, `.com.au`)
- ✅ Explicit and predictable
- ✅ Simpler code, easier maintenance
- ✅ Perfect for email domain blocking

**Use Case Fit:**
Email domains rarely use subdomains (`user@company.com`, not `user@mail.company.com`), so subdomain stripping was solving a problem we don't have.

**To Block Multiple Domains:**
- Create separate entries for each domain/subdomain
- OR implement wildcard matching in UI layer (not in DB)

---

## Support & References

- **Prisma Schema**: `packages/prisma/schema.prisma` (lines 2270-2324)
- **Performance Analysis**: `packages/features/watchlist/PERFORMANCE_INDEXES.md`
- **DI Container**: `packages/features/di/watchlist/containers/watchlist.ts`
- **Integration Examples**: See "Integration Points" section above
- **Test Files**: `packages/features/watchlist/**/**.test.ts` (8 files, 92 tests)

---

**End of Architecture Snapshot**

