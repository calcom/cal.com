---
title: Never Introduce Breaking API Changes
impact: CRITICAL
impactDescription: Maintains developer trust and prevents integration nightmares
tags: api, stability, versioning, backwards-compatibility
---

## Never Introduce Breaking API Changes

**Impact: CRITICAL**

Once an API endpoint is public, it must remain stable. Breaking changes destroy developer trust and create integration nightmares for our users.

**Strategies for avoiding breaking changes:**
- Always add new fields as optional
- Use API versioning when you must change existing behavior
- Deprecate old endpoints gracefully with clear migration paths
- Maintain backward compatibility for at least two major versions

**Incorrect (breaking change):**

```typescript
// v1 - Original response
interface BookingResponse {
  id: number;
  startTime: string; // ISO string
}

// v1 - Breaking change: renamed field
interface BookingResponse {
  id: number;
  start: string; // Renamed from startTime - BREAKS CLIENTS
}
```

**Correct (non-breaking evolution):**

```typescript
// v1 - Original response
interface BookingResponse {
  id: number;
  startTime: string;
}

// v1 - Non-breaking: add new field, keep old one
interface BookingResponse {
  id: number;
  startTime: string; // Keep for backwards compatibility
  start: string; // New preferred field
}
```

**When you must make breaking changes:**
- Create a new API version using date-specific versioning in API v2
- Run both versions simultaneously during transition
- Provide automated migration tools when possible
- Give users ample time to migrate (minimum 6 months for public APIs)
- Document exactly what changed and why

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
