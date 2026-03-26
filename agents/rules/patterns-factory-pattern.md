---
title: Use Factory Pattern to Push Conditionals to Entry Points
impact: HIGH
impactDescription: Keeps services focused and prevents complexity accumulation
tags: patterns, factory, conditionals, single-responsibility
---

## Use Factory Pattern to Push Conditionals to Entry Points

**Impact: HIGH**

If statements belong at the entry point, not scattered throughout your services. This is one of the most important architectural principles for maintaining clean, focused code that doesn't spiral into unmaintainable complexity.

**The problem with scattered conditionals:**
A service is written for a clear, specific purpose. Then a new product requirement arrives, and someone adds an if statement. A few years later, that service is littered with conditional checks. The service becomes:
- Complicated and hard to read
- Difficult to understand and reason about
- More susceptible to bugs
- Violating single responsibility
- Nearly impossible to test thoroughly

**Incorrect (conditionals scattered in service):**

```typescript
class BillingService {
  async processPayment(entityId: number, entityType: string) {
    if (entityType === "organization") {
      // Organization-specific logic
      const org = await this.getOrganization(entityId);
      if (org.billingPlan === "enterprise") {
        // More nested conditionals...
      }
    } else if (entityType === "team") {
      // Team-specific logic
    } else if (entityType === "user") {
      // User-specific logic
    }
  }
}
```

**Correct (Factory pattern with specialized services):**

```typescript
// Factory makes the decision at entry point
class BillingServiceFactory {
  static async createService(entityId: number): Promise<BillingService> {
    const entity = await determineEntityType(entityId);
    
    switch (entity.type) {
      case "organization":
        return new OrganizationBillingService(entity);
      case "team":
        return new TeamBillingService(entity);
      default:
        return new UserBillingService(entity);
    }
  }
}

// Each service handles ONLY its specific logic - no conditionals
class OrganizationBillingService extends BillingService {
  async processPayment() {
    // Only organization logic here - clean and focused
  }
}

class TeamBillingService extends BillingService {
  async processPayment() {
    // Only team logic here - clean and focused
  }
}
```

**Benefits:**
- Services stay focused with one responsibility
- Changes are isolated to specific service implementations
- Testing is straightforward - test each service independently
- New requirements don't pollute existing code

**Guidelines:**
- Push conditionals up to controllers, factories, or routing logic
- Keep services pure and focused on a single responsibility
- Prefer polymorphism over conditionals
- Watch for if statement accumulation during code review

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
