---
title: Use DTOs at Every Architectural Boundary
impact: CRITICAL
impactDescription: Prevents technology coupling and security risks
tags: data, dto, boundaries, security, types
---

## Use DTOs at Every Architectural Boundary

**Impact: CRITICAL**

Database types should not leak to the frontend. This has become a popular shortcut in our tech stack, but it's a code smell that creates multiple problems.

**Problems with leaking database types:**
- Technology coupling (Prisma types end up in React components)
- Security risks (accidental leakage of sensitive fields)
- Fragile contracts between server and client
- Inability to evolve the database schema independently

**Incorrect (database types leaking):**

```typescript
// API route returning Prisma types directly
import type { User } from "@prisma/client";

export async function GET(): Promise<User> {
  const user = await prisma.user.findFirst();
  return user; // Leaks all database fields including sensitive ones
}

// Frontend using Prisma types
import type { User } from "@prisma/client";

function UserProfile({ user }: { user: User }) {
  // Component now coupled to database schema
}
```

**Correct (explicit DTOs):**

```typescript
// Define explicit DTOs
interface UserDTO {
  id: number;
  name: string;
  email: string;
  // Only fields needed by the client
}

// API route transforms to DTO
export async function GET(): Promise<UserDTO> {
  const user = await userRepository.findById(id);
  return UserResponseSchema.parse(user); // Validate with Zod
}

// Frontend uses DTO
function UserProfile({ user }: { user: UserDTO }) {
  // Component decoupled from database
}
```

**The standard:**
1. **Data layer → Application layer → API**: Transform database models into application-layer DTOs, then transform application DTOs into API-specific DTOs
2. **API → Application layer → Data layer**: Transform API DTOs through application layer and into data-specific DTOs
3. All DTO conversions through Zod to ensure all data is validated before sending to user

### DTO Location and Naming

**Location**: All DTOs go in `packages/lib/dto/`

**Naming conventions**:
- Base entity: `{Entity}Dto` (e.g., `BookingDto`)
- With relations: `{Entity}With{Relations}Dto` (e.g., `BookingWithAttendeesDto`)
- For specific projections: `{Entity}For{Purpose}Dto` (e.g., `BookingForConfirmationDto`)
- Avoid: `{Entity}Dto2`, `{Entity}DtoForHandler`, or other use-case-specific names

**Enum/union pattern** - use string literal unions to stay ORM-agnostic:

```typescript
// Good - ORM-agnostic string literal union
export type BookingStatusDto = "CANCELLED" | "ACCEPTED" | "REJECTED" | "PENDING";

// Bad - importing Prisma enum
import { BookingStatus } from "@calcom/prisma/client";
```

**Type safety** - never use `as any` in DTO mapping functions. If types don't align, fix the mapping explicitly.

### Prisma Boundaries

- **Allowed**: `packages/prisma`, repository implementations (`packages/features/**/repositories/*Repository.ts`), and low-level data access infrastructure.
- **Not allowed**: `packages/features/**` business logic (non-repository), `packages/trpc/**` handlers, `apps/web/**`, `apps/api/v2/**` services/controllers, and workflow/webhook/service layers.

Yes, this requires more code. Yes, it's worth it. Explicit boundaries prevent the architectural erosion that creates long-term maintenance nightmares.

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
