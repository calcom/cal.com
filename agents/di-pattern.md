# Dependency Injection (DI) Pattern

We use a Dependency Injection pattern powered by `@evyweb/ioctopus` to manage service and repository dependencies. This pattern ensures proper dependency management, testability, and consistent instantiation of services throughout the codebase.

We use the **moduleLoader pattern** which provides type-safe dependency injection. This ensures that if a service adds a new dependency, TypeScript will catch missing dependencies at build time rather than runtime.

## Core Concepts

The DI system consists of four main components:

**Tokens**: Unique symbols that identify each service or repository in the DI container. Every injectable class needs a corresponding token. Tokens should be defined in a `tokens.ts` file within the feature's `di/` directory.

**Modules** (`.module.ts` files): Define how classes are instantiated and what dependencies they require using the `bindModuleToClassOnToken` function. Each module exports a `moduleLoader` object that knows how to load itself and its dependencies.

**Containers** (`.container.ts` files): Create a container instance and expose getter functions that consumers use to obtain service instances. Containers use the moduleLoader to automatically load all required dependencies.

**`bindModuleToClassOnToken`**: A type-safe function that binds a class to a token and declares its dependencies. TypeScript ensures the declared dependencies match what the class constructor expects.

## How It Works

Here's the complete flow for creating a DI-enabled service:

**Step 1: Create tokens in the feature's di directory**

```typescript
// packages/features/myfeature/di/tokens.ts
export const MY_FEATURE_DI_TOKENS = {
  MY_SERVICE: Symbol("MyService"),
  MY_SERVICE_MODULE: Symbol("MyServiceModule"),
};
```

Then import these tokens in the central tokens file:

```typescript
// packages/features/di/tokens.ts
import { MY_FEATURE_DI_TOKENS } from "@calcom/features/myfeature/di/tokens";

export const DI_TOKENS = {
  // ...existing tokens
  ...MY_FEATURE_DI_TOKENS,
};
```

**Step 2: Define the service class with constructor injection**

For services with multiple dependencies, use a dependencies interface:

```typescript
// packages/features/myfeature/services/MyService.ts
export interface IMyServiceDeps {
  bookingRepo: BookingRepository;
  userRepo: UserRepository;
}

export class MyService {
  constructor(private deps: IMyServiceDeps) {}

  async doSomething() {
    const bookings = await this.deps.bookingRepo.findMany({...});
    const user = await this.deps.userRepo.findById({...});
  }
}
```

For services/repositories with a single dependency, pass it directly:

```typescript
// packages/features/myfeature/repositories/MyRepository.ts
export class MyRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: string) {
    return this.prismaClient.myModel.findUnique({ where: { id } });
  }
}
```

**Step 3: Create a module file with moduleLoader**

```typescript
// packages/features/myfeature/di/MyService.module.ts
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { MyService } from "@calcom/features/myfeature/services/MyService";

import { moduleLoader as bookingRepositoryModuleLoader } from "./BookingRepository.module";
import { moduleLoader as userRepositoryModuleLoader } from "./UserRepository.module";
import { MY_FEATURE_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = MY_FEATURE_DI_TOKENS.MY_SERVICE;
const moduleToken = MY_FEATURE_DI_TOKENS.MY_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MyService,
  // For multiple dependencies, use depsMap:
  depsMap: {
    bookingRepo: bookingRepositoryModuleLoader,
    userRepo: userRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { MyService };
```

For a single dependency, use `dep` instead of `depsMap`:

```typescript
// packages/features/myfeature/di/MyRepository.module.ts
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { MyRepository } from "@calcom/features/myfeature/repositories/MyRepository";

import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { MY_FEATURE_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = MY_FEATURE_DI_TOKENS.MY_REPOSITORY;
const moduleToken = MY_FEATURE_DI_TOKENS.MY_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MyRepository,
  // For single dependency, use dep:
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { MyRepository };
```

**Step 4: Create a container that uses the moduleLoader**

```typescript
// packages/features/myfeature/di/MyService.container.ts
import { createContainer } from "@calcom/features/di/di";

import { type MyService, moduleLoader as myServiceModuleLoader } from "./MyService.module";

const myServiceContainer = createContainer();

export function getMyService(): MyService {
  myServiceModuleLoader.loadModule(myServiceContainer);
  return myServiceContainer.get<MyService>(myServiceModuleLoader.token);
}
```

**Step 5: Use the service via the container's getter function**

```typescript
// Anywhere in the codebase
import { getMyService } from "@calcom/features/myfeature/di/MyService.container";

const myService = getMyService();
await myService.doSomething();
```

## Why moduleLoader Is Type-Safe

The `bindModuleToClassOnToken` function in `packages/features/di/di.ts` uses TypeScript generics to infer the required dependencies from the class constructor:

```typescript
depsMap: Record<
  keyof (TClass extends new (deps: infer TDeps) => any ? TDeps : never),
  ModuleLoader
>
```

This means if `MyService` adds a new constructor dependency (e.g., `eventTypeRepo`), TypeScript will error because `depsMap` is missing that key. The error happens at build time, not runtime.

The `loadModule` function also automatically loads all dependencies recursively, so you don't need to manually track the dependency chain.

## Common Mistakes to Avoid

**Mistake 1: Creating a repository or service class with all static methods**

Static methods bypass the DI system entirely, making the code harder to test and breaking the dependency chain.

```typescript
// Bad - Static methods bypass DI
export class BookingRepository {
  static async findById(id: string) {
    return prisma.booking.findUnique({ where: { id } });
  }
}

// Usage (wrong - no DI)
const booking = await BookingRepository.findById("123");
```

```typescript
// Good - Instance methods with constructor injection
export class BookingRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: string) {
    return this.prismaClient.booking.findUnique({ where: { id } });
  }
}

// Usage (correct - via DI container)
const bookingRepo = getBookingRepository();
const booking = await bookingRepo.findById("123");
```

**Mistake 2: Manually instantiating a class instead of using the DI container**

Even if you define a class with constructor injection, manually calling `new` bypasses the DI system and its benefits.

```typescript
// Bad - Manual instantiation bypasses DI
import { MyService } from "@calcom/features/myfeature/services/MyService";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import prisma from "@calcom/prisma";

const bookingRepo = new BookingRepository(prisma);
const myService = new MyService({ bookingRepo });
```

```typescript
// Good - Use the DI container's getter function
import { getMyService } from "@calcom/features/myfeature/di/MyService.container";

const myService = getMyService();
```

**Mistake 3: Importing Prisma directly in a service instead of using repository injection**

Services should depend on repositories, not directly on Prisma. This maintains proper separation of concerns.

```typescript
// Bad - Service imports Prisma directly
import prisma from "@calcom/prisma";

export class MyService {
  async doSomething() {
    const bookings = await prisma.booking.findMany({...}); // Wrong!
  }
}
```

```typescript
// Good - Service depends on repository via DI
export interface IMyServiceDeps {
  bookingRepo: BookingRepository;
}

export class MyService {
  constructor(private deps: IMyServiceDeps) {}

  async doSomething() {
    const bookings = await this.deps.bookingRepo.findMany({...});
  }
}
```

**Mistake 4: Manual module loading in containers (not type-safe)**

Don't manually call `container.load()` for each dependency. This is not type-safe and can lead to runtime errors if you forget to load a dependency.

```typescript
// Bad - Manual module loading is not type-safe
const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.MY_SERVICE_MODULE, myServiceModule);
// If MyService adds a new dependency, TypeScript won't catch the missing load()

export function getMyService() {
  return container.get<MyService>(DI_TOKENS.MY_SERVICE);
}
```

```typescript
// Good - Use moduleLoader for type-safe dependency loading
import { moduleLoader as myServiceModuleLoader } from "./MyService.module";

const container = createContainer();

export function getMyService(): MyService {
  myServiceModuleLoader.loadModule(container); // Automatically loads all dependencies
  return container.get<MyService>(myServiceModuleLoader.token);
}
```

## Why Use DI?

- **Build-time safety**: TypeScript catches missing dependencies before runtime when using the moduleLoader pattern
- **Testability**: Dependencies can be easily mocked in tests by providing alternative implementations
- **Consistency**: All instances are created the same way with proper dependencies
- **Maintainability**: Changing a dependency only requires updating the module binding, not every usage site
- **Automatic dependency resolution**: The moduleLoader automatically loads all dependencies recursively
- **Self-documenting**: Each module declares its own dependencies, making the dependency graph explicit
