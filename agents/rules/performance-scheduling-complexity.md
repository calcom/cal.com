---
title: Handle NP-Hard Scheduling Problems Carefully
impact: HIGH
impactDescription: Prevents exponential blowup in scheduling operations
tags: performance, scheduling, algorithms, np-hard
---

## Handle NP-Hard Scheduling Problems Carefully

**Impact: HIGH**

Scheduling problems are fundamentally NP-hard. This means that as the number of constraints, participants, or time slots grows, the computational complexity can explode exponentially. Most optimal scheduling algorithms have worst-case exponential time complexity, making algorithm choice absolutely critical.

**Real-world implications:**
- Finding the optimal meeting time for 10 people across 3 time zones with individual availability constraints is computationally expensive
- Adding conflict detection, buffers, and other options amplifies the problem
- Poor algorithm choices that work fine for small teams become completely unusable for large organizations
- What takes milliseconds for 5 users might take many seconds for organizations

**Strategies for managing NP-hard complexity:**

```typescript
// Use approximation algorithms
async function findMeetingTime(participants: User[], duration: number) {
  // Find "good enough" solution quickly rather than perfect solution slowly
  const approximateSlots = await findApproximateAvailability(participants, {
    maxIterations: 1000,
    timeout: 500, // ms
  });
  
  return approximateSlots[0]; // Return first good-enough option
}

// Implement aggressive caching
const cachedAvailability = new LRUCache<string, Availability>({
  max: 10000,
  ttl: 1000 * 60 * 5, // 5 minutes
});

// Pre-compute common scenarios during off-peak hours
async function precomputeTeamAvailability(teamId: number) {
  // Run during low-traffic periods
  const team = await teamRepository.findById(teamId);
  const availability = await computeTeamAvailability(team);
  await cache.set(`team:${teamId}:availability`, availability);
}
```

**Key strategies:**
- Use approximation algorithms that find "good enough" solutions quickly
- Implement aggressive caching of computed schedules and availability
- Pre-compute common scenarios during off-peak hours
- Break large scheduling problems into smaller, more manageable chunks
- Set reasonable timeout limits and fallback to simpler algorithms when needed

This is why performance isn't just a nice-to-have in scheduling software. It's the foundation that determines whether your system can scale to enterprise needs.

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
