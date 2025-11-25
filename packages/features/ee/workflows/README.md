# Workflows Feature - DDD Architecture

This feature is being migrated to follow Domain-Driven Design (DDD) principles, following the same patterns established in the PBAC feature.

## Architecture Overview

### Domain Layer (`domain/`)
Contains business logic and domain models, completely independent of infrastructure concerns (Prisma, databases, etc.).

- **`domain/models/`**: Domain entities (Workflow, WorkflowStep, WorkflowReminder)
- **`domain/repositories/`**: Repository interfaces using domain types only
- **`domain/types/`**: Domain enums and value objects

### Infrastructure Layer (`infrastructure/`)
Handles data persistence and external integrations.

- **`infrastructure/repositories/`**: Concrete repository implementations using Prisma
- **`infrastructure/mappers/`**: Converts between Prisma models and domain models

### Legacy Code (`repositories/WorkflowRepository.ts`)
The existing static `WorkflowRepository` class (861 lines) contains both core workflow operations and specialized methods (verification, reminders, filtering). This is being gradually migrated to use the new DDD structure.

## Usage Example

### Using the New DDD Repository

```typescript
import { WorkflowRepository } from "@calcom/features/ee/workflows/infrastructure/repositories/WorkflowRepository";
import prisma from "@calcom/prisma";

// Create repository instance
const workflowRepo = new WorkflowRepository(prisma);

// Find workflows
const workflows = await workflowRepo.findByUserId(userId, true);

// Create workflow
const newWorkflow = await workflowRepo.create({
  name: "My Workflow",
  userId: 123,
  trigger: "BEFORE_EVENT",
  time: 24,
  timeUnit: "HOUR",
});

// Update workflow
const updated = await workflowRepo.update(workflowId, {
  name: "Updated Name",
  time: 48,
});
```

### Key Differences from Legacy Repository

| Aspect | Legacy Repository | New DDD Repository |
|--------|------------------|-------------------|
| **Pattern** | Static class methods | Instance-based with dependency injection |
| **Types** | Returns Prisma types directly | Returns domain models |
| **Dependencies** | Direct Prisma imports everywhere | Prisma isolated in infrastructure layer |
| **Testing** | Hard to mock static methods | Easy to mock via interface |
| **Separation** | Mixed concerns | Clean layer separation |

## Migration Strategy

The migration follows an incremental approach:

1. ✅ **Phase 1**: Establish DDD foundation (domain models, interfaces, infrastructure)
2. **Phase 2**: Migrate core workflow CRUD operations to use new repository
3. **Phase 3**: Migrate specialized operations (verification, reminders, filtering)
4. **Phase 4**: Deprecate and remove legacy repository

## Benefits of DDD Structure

1. **Testability**: Repository interfaces can be easily mocked for unit testing
2. **Maintainability**: Clear separation of concerns makes code easier to understand
3. **Flexibility**: Can swap infrastructure implementations without changing domain logic
4. **Type Safety**: Domain models provide better type safety than raw Prisma types
5. **Consistency**: Follows the same patterns as PBAC feature

## Related Documentation

- PBAC Feature: `packages/features/pbac/` (reference implementation)
- Domain-Driven Design: https://martinfowler.com/bliki/DomainDrivenDesign.html
