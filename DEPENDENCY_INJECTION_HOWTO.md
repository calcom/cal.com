# Dependency Injection HOWTO Guide for Cal.com

This guide documents the dependency injection patterns implemented in Cal.com, covering both the NestJS DI pattern (for v2 API) and the ioctopus DI pattern (for webapp). This follows the implementation established in [PR #22356](https://github.com/calcom/cal.com/pull/22356).

## Table of Contents

1. [Overview](#overview)
2. [NestJS DI Pattern (v2 API)](#nestjs-di-pattern-v2-api)
3. [Ioctopus DI Pattern (Webapp)](#ioctopus-di-pattern-webapp)
4. [Migration Examples](#migration-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Overview

Cal.com uses two distinct dependency injection systems:

- **NestJS DI**: Used in the v2 API (`apps/api/v2/`) for services, repositories, and workers
- **Ioctopus DI**: Used in the webapp (`packages/`) for shared services across the application

### When to Use Each Pattern

| Use Case | Pattern | Location |
|----------|---------|----------|
| v2 API services and repositories | NestJS DI | `apps/api/v2/src/` |
| v2 API workers | NestJS DI | `apps/api/v2/src/modules/*/workers/` |
| Webapp shared services | Ioctopus DI | `packages/lib/di/` |
| tRPC handlers | Ioctopus DI | `packages/trpc/server/` |

## NestJS DI Pattern (v2 API)

The NestJS DI pattern uses decorators and constructor injection for dependency management in the v2 API.

### Key Components

1. **@Injectable() decorator**: Marks classes as injectable services
2. **Constructor injection**: Dependencies injected through constructor parameters
3. **Module providers**: Services registered in module provider arrays
4. **Inheritance**: Services can extend base classes while maintaining DI

### Implementation Steps

#### Step 1: Create Injectable Repository

Create a repository that extends a base repository and injects Prisma:

```typescript
// apps/api/v2/src/lib/repositories/PrismaOOORepository.ts
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaOOORepository } from "@calcom/platform-libraries/repositories";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class OOORepository extends PrismaOOORepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
```

#### Step 2: Create Injectable Service

Create a service that depends on repositories:

```typescript
// apps/api/v2/src/lib/services/AvailableSlots.ts
import { OOORepository } from "@/lib/repositories/PrismaOOORepository";
import { ScheduleRepository } from "@/lib/repositories/PrismaScheduleRepository";
import { Injectable } from "@nestjs/common";

import { AvailableSlotsService as BaseAvailableSlotsService } from "@calcom/platform-libraries/slots";

@Injectable()
export class AvailableSlotsService extends BaseAvailableSlotsService {
  constructor(
    private readonly oooRepoDependency: OOORepository,
    private readonly scheduleRepoDependency: ScheduleRepository
  ) {
    super({ oooRepo: oooRepoDependency, scheduleRepo: scheduleRepoDependency });
  }
}
```

#### Step 3: Configure Module

Register all dependencies in a NestJS module:

```typescript
// apps/api/v2/src/modules/slots/slots-2024-04-15/workers/slots.worker.module.ts
import { OOORepository as PrismaOOORepository } from "@/lib/repositories/PrismaOOORepository";
import { ScheduleRepository as PrismaScheduleRepository } from "@/lib/repositories/PrismaScheduleRepository";
import { AvailableSlotsService } from "@/lib/services/AvailableSlots";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module, Logger } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [Logger, PrismaOOORepository, PrismaScheduleRepository, AvailableSlotsService],
})
export class SlotsWorkerModule {}
```

#### Step 4: Use in Workers

Workers are micro NestJS applications that can resolve dependencies:

```typescript
// apps/api/v2/src/modules/slots/slots-2024-04-15/workers/slots.worker.ts
import { AvailableSlotsService } from "@/lib/services/AvailableSlots";
import { NestFactory } from "@nestjs/core";
import { SlotsWorkerModule } from "./slots.worker.module";

async function bootstrapWorkerApp() {
  const app = await NestFactory.createApplicationContext(SlotsWorkerModule);
  const availableSlotsService = app.get(AvailableSlotsService);
  
  // Use the service...
  const result = await availableSlotsService.getAvailableSlots({ input, ctx });
}
```

### NestJS DI Best Practices

1. **Always use @Injectable()** on services and repositories
2. **Prefer constructor injection** over property injection
3. **Use private readonly** for injected dependencies
4. **Register all providers** in module provider arrays
5. **Import required modules** in the imports array
6. **Extend base classes** when available to reuse logic

## Ioctopus DI Pattern (Webapp)

The ioctopus DI pattern uses tokens, modules, and containers for dependency management in the webapp.

### Key Components

1. **Tokens**: Unique symbols identifying dependencies
2. **Modules**: Configuration units that bind tokens to implementations
3. **Containers**: Runtime instances that resolve dependencies
4. **Service resolution**: Getting instances from containers

### Implementation Steps

#### Step 1: Define Tokens

Create unique symbols for each dependency:

```typescript
// packages/lib/di/tokens.ts
export const DI_TOKENS = {
  PRISMA_CLIENT: Symbol("PrismaClient"),
  READ_ONLY_PRISMA_CLIENT: Symbol("ReadOnlyPrismaClient"),
  PRISMA_MODULE: Symbol("PrismaModule"),
  OOO_REPOSITORY: Symbol("OOORepository"),
  OOO_REPOSITORY_MODULE: Symbol("OOORepositoryModule"),
  SCHEDULE_REPOSITORY: Symbol("ScheduleRepository"),
  SCHEDULE_REPOSITORY_MODULE: Symbol("ScheduleRepositoryModule"),
  AVAILABLE_SLOTS_SERVICE: Symbol("AvailableSlotsService"),
  AVAILABLE_SLOTS_SERVICE_MODULE: Symbol("AvailableSlotsModule"),
};
```

#### Step 2: Create Modules

Create modules that bind tokens to implementations:

```typescript
// packages/lib/di/modules/available-slots.ts
import { createModule } from "@evyweb/ioctopus";

import type { IAvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";
import { AvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";

import { DI_TOKENS } from "../tokens";

export const availableSlotsModule = createModule();
availableSlotsModule.bind(DI_TOKENS.AVAILABLE_SLOTS_SERVICE).toClass(AvailableSlotsService, {
  oooRepo: DI_TOKENS.OOO_REPOSITORY,
  scheduleRepo: DI_TOKENS.SCHEDULE_REPOSITORY,
} satisfies Record<keyof IAvailableSlotsService, symbol>);
```

```typescript
// packages/lib/di/modules/schedule.ts
import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";

export const scheduleRepositoryModule = createModule();
scheduleRepositoryModule
  .bind(DI_TOKENS.SCHEDULE_REPOSITORY)
  .toClass(ScheduleRepository, [DI_TOKENS.PRISMA_CLIENT]);
```

#### Step 3: Create Container

Create a container that loads all modules:

```typescript
// packages/lib/di/containers/available-slots.ts
import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";
import type { AvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";

import { availableSlotsModule } from "../modules/available-slots";
import { oooRepositoryModule } from "../modules/ooo";
import { scheduleRepositoryModule } from "../modules/schedule";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
container.load(DI_TOKENS.SCHEDULE_REPOSITORY_MODULE, scheduleRepositoryModule);
container.load(DI_TOKENS.AVAILABLE_SLOTS_SERVICE_MODULE, availableSlotsModule);

export function getAvailableSlotsService() {
  return container.get<AvailableSlotsService>(DI_TOKENS.AVAILABLE_SLOTS_SERVICE);
}
```

#### Step 4: Use in Handlers

Use the container to resolve services in tRPC handlers:

```typescript
// packages/trpc/server/routers/viewer/slots/getSchedule.handler.ts
import { getAvailableSlotsService } from "@calcom/lib/di/containers/available-slots";

import type { GetScheduleOptions } from "./types";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
```

### Ioctopus DI Best Practices

1. **Use descriptive token names** that clearly identify the dependency
2. **Create focused modules** that handle related dependencies
3. **Use type-safe binding** with `satisfies` for better type checking
4. **Create container functions** for easy service resolution
5. **Load modules in dependency order** in containers
6. **Use interfaces** to define service contracts

## Migration Examples

### Before: Direct Instantiation

```typescript
// Before - Direct instantiation
const availableSlotsService = new AvailableSlotsService();

parentPort?.on("message", async (data) => {
  const result = await availableSlotsService.getAvailableSlots({ input, ctx });
  parentPort?.postMessage({ success: true, data: result });
});
```

### After: NestJS DI (v2 API)

```typescript
// After - NestJS DI in worker
async function bootstrapWorkerApp() {
  const app = await NestFactory.createApplicationContext(SlotsWorkerModule);
  const availableSlotsService = app.get(AvailableSlotsService);

  parentPort?.on("message", async (data) => {
    const result = await availableSlotsService.getAvailableSlots({ input, ctx });
    parentPort?.postMessage({ success: true, data: result });
  });
}
```

### After: Ioctopus DI (Webapp)

```typescript
// After - Ioctopus DI in handler
export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
```

## Best Practices

### General Principles

1. **Separation of Concerns**: Use NestJS DI for v2 API, ioctopus DI for webapp
2. **Interface Segregation**: Define clear interfaces for service contracts
3. **Dependency Inversion**: Depend on abstractions, not concretions
4. **Single Responsibility**: Each service should have one clear purpose

### Code Organization

1. **Repository Pattern**: Use repositories for data access logic
2. **Service Layer**: Use services for business logic
3. **Module Organization**: Group related dependencies in modules
4. **Container Functions**: Create helper functions for service resolution

### Testing Considerations

1. **Mock Dependencies**: Use DI to easily mock dependencies in tests
2. **Test Modules**: Create separate modules for testing with mock providers
3. **Dependency Isolation**: Test services in isolation from their dependencies

## Troubleshooting

### Common Issues

#### NestJS DI Issues

**Problem**: `Cannot resolve dependencies` error
```
Error: Nest can't resolve dependencies of the AvailableSlotsService (?). 
Please make sure that the argument dependency at index [0] is available in the SlotsWorkerModule context.
```

**Solution**: Ensure all dependencies are registered in the module providers array:
```typescript
@Module({
  providers: [
    OOORepository,           // Add missing repository
    ScheduleRepository,      // Add missing repository
    AvailableSlotsService,   // Service that depends on repositories
  ],
})
```

**Problem**: Circular dependency error

**Solution**: Use `forwardRef()` or restructure dependencies to avoid cycles:
```typescript
constructor(
  @Inject(forwardRef(() => SomeService))
  private readonly someService: SomeService
) {}
```

#### Ioctopus DI Issues

**Problem**: Token not found in container

**Solution**: Ensure the module containing the token is loaded in the container:
```typescript
container.load(DI_TOKENS.MISSING_MODULE, missingModule);
```

**Problem**: Type mismatch in service binding

**Solution**: Use `satisfies` to ensure type safety:
```typescript
availableSlotsModule.bind(DI_TOKENS.SERVICE).toClass(ServiceClass, {
  dependency: DI_TOKENS.DEPENDENCY,
} satisfies Record<keyof IServiceInterface, symbol>);
```

### Debugging Tips

1. **Check module imports**: Ensure all required modules are imported
2. **Verify token definitions**: Make sure tokens are unique symbols
3. **Review binding configuration**: Check that dependencies are correctly mapped
4. **Use type checking**: Leverage TypeScript for compile-time validation

## Reference Implementation

The complete implementation can be found in [PR #22356](https://github.com/calcom/cal.com/pull/22356), which demonstrates the migration of the AvailableSlotsService to use both DI patterns.

### Key Files

- **NestJS DI Implementation**:
  - `apps/api/v2/src/lib/services/AvailableSlots.ts`
  - `apps/api/v2/src/lib/repositories/PrismaOOORepository.ts`
  - `apps/api/v2/src/lib/repositories/PrismaScheduleRepository.ts`
  - `apps/api/v2/src/modules/slots/slots-2024-04-15/workers/slots.worker.module.ts`

- **Ioctopus DI Implementation**:
  - `packages/lib/di/tokens.ts`
  - `packages/lib/di/modules/available-slots.ts`
  - `packages/lib/di/containers/available-slots.ts`
  - `packages/trpc/server/routers/viewer/slots/getSchedule.handler.ts`

This guide should serve as your reference when implementing dependency injection in new Cal.com features. Follow these patterns to maintain consistency and improve code maintainability across the codebase.
