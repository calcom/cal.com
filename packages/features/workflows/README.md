# Workflow Permissions - Domain-Driven Design

This package implements workflow permissions using Domain-Driven Design (DDD) principles. The structure separates business logic from infrastructure concerns and provides a clean, maintainable architecture.

## Architecture Overview

```
workflows/
├── domain/                    # Core business logic (no external dependencies)
│   ├── entities/             # Business entities with identity
│   ├── value-objects/        # Immutable objects representing concepts
│   ├── services/             # Domain services containing business logic
│   └── repositories/         # Repository interfaces (contracts)
├── application/              # Application services (use cases)
├── infrastructure/           # External concerns (database, PBAC, caching)
└── repositories/             # Legacy code (backward compatibility)
```

## Domain Layer

### Value Objects

**WorkflowPermission** - Immutable object representing user permissions on a workflow:

```typescript
const permission = WorkflowPermission.fullAccess();
console.log(permission.canView); // true
console.log(permission.readOnly); // false
```

**WorkflowId, UserId, TeamId** - Type-safe identifiers with validation:

```typescript
const workflowId = WorkflowId.fromNumber(123);
const userId = UserId.fromString("456");
```

### Entities

**Workflow** - Core business entity representing a workflow:

```typescript
const workflow = Workflow.fromPrimitives(1, 123, null); // Personal workflow
console.log(workflow.isPersonal()); // true
console.log(workflow.isOwnedBy(UserId.fromNumber(123))); // true
```

### Domain Service

**WorkflowPermissionService** - Contains core business logic for permission checking:

```typescript
const service = new WorkflowPermissionService(repository);
const permissions = await service.getPermissions(workflow, userId);
```

## Application Layer

**WorkflowPermissionApplicationService** - Public API for the application:

```typescript
import { getWorkflowPermissionService } from "./application";

const service = getWorkflowPermissionService();
const permissions = await service.getWorkflowPermissions(workflow, userId);
```

## Infrastructure Layer

**WorkflowPermissionRepository** - Handles external concerns:

- Integration with existing PBAC system
- Caching team permissions for performance
- Converting between domain objects and primitives

## Migration Guide

### Before (Legacy)

```typescript
import { addPermissionsToWorkflow } from "./repositories/WorkflowPermissionsRepository";

const workflowWithPermissions = await addPermissionsToWorkflow(workflow, userId);
```

### After (DDD)

```typescript
import { getWorkflowPermissionService } from "./application";

const service = getWorkflowPermissionService();
const permissions = await service.getWorkflowPermissions(workflow, userId);
```

### Backward Compatibility

The legacy `WorkflowPermissionsRepository.ts` still works and delegates to the new DDD structure. This ensures existing code continues to function while new code can use the improved architecture.

## Benefits of DDD Structure

1. **Separation of Concerns**: Business logic is isolated from infrastructure
2. **Testability**: Domain logic can be tested without external dependencies
3. **Maintainability**: Clear boundaries between layers make code easier to understand
4. **Type Safety**: Value objects provide compile-time guarantees
5. **Performance**: Optimized batch operations and caching at the infrastructure level

## Business Rules

1. **Personal Workflows**: Only the owner has full access (view, update, delete)
2. **Team Workflows**: Permissions determined by team membership and PBAC system
3. **Null Workflows**: No access granted
4. **Workflow Ownership**: A workflow belongs to either a user OR a team, never both

## Usage Examples

### Single Workflow Permission Check

```typescript
const service = getWorkflowPermissionService();
const canUpdate = await service.canPerformAction(workflow, userId, "update");
```

### Batch Permission Processing (Optimized)

```typescript
const service = getWorkflowPermissionService();
const workflowsWithPermissions = await service.getWorkflowPermissionsBatch(workflows, userId);
```

### Direct Domain Usage

```typescript
import { WorkflowPermissionService } from "./domain";
import { WorkflowPermissionRepository } from "./infrastructure";

const repository = new WorkflowPermissionRepository();
const service = new WorkflowPermissionService(repository);
const permissions = await service.getPermissions(workflow, userId);
```

## Testing

The domain layer can be tested in isolation:

```typescript
import { WorkflowPermission, Workflow, UserId } from "./domain";

// Test value objects
const permission = WorkflowPermission.fullAccess();
expect(permission.canView).toBe(true);

// Test entities
const workflow = Workflow.fromPrimitives(1, 123, null);
expect(workflow.isOwnedBy(UserId.fromNumber(123))).toBe(true);
```

For integration tests, mock the repository interface:

```typescript
const mockRepository: IWorkflowPermissionRepository = {
  getWorkflowPermissions: jest.fn().mockResolvedValue(WorkflowPermission.fullAccess()),
  // ... other methods
};

const service = new WorkflowPermissionService(mockRepository);
```
