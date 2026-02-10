---
title: Organize Code by Domain Using Vertical Slices
impact: CRITICAL
impactDescription: Dramatically improves discoverability and reduces cross-team conflicts
tags: architecture, vertical-slices, ddd, organization
---

## Organize Code by Domain Using Vertical Slices

**Impact: CRITICAL**

Our codebase is organized by domain, not by technical layer. The `packages/features` directory is the heart of this architectural approach. Each folder inside represents a complete vertical slice of the application, driven by the domain it touches.

**Incorrect (traditional layered architecture):**

```
src/
  controllers/
    bookingController.ts
    availabilityController.ts
  services/
    bookingService.ts
    availabilityService.ts
  repositories/
    bookingRepository.ts
    availabilityRepository.ts
```

This creates problems: changes to one feature require touching files scattered across multiple directories, it's hard to understand what a feature does because its code is fragmented, and teams step on each other's toes.

**Correct (vertical slice architecture):**

```
packages/features/
  bookings/
    services/
    repositories/
    components/
    tests/
  availability/
    services/
    repositories/
    components/
    tests/
```

Each feature folder is a self-contained vertical slice that includes:
- Domain logic: Core business rules and entities specific to that feature
- Application services: Use case orchestration for that domain
- Repositories: Data access specific to that feature's needs
- DTOs: Data transfer objects for crossing boundaries
- UI components: Frontend components related to this feature
- Tests: Unit, integration, and e2e tests for this feature

**Benefits:**
- Everything related to a feature lives in one directory
- You can understand the entire feature by exploring one directory
- Teams can work on different features without conflicts
- Features are loosely coupled and can evolve independently

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
