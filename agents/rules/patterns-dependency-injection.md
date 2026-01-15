---
title: Use Dependency Injection for Loose Coupling
impact: HIGH
impactDescription: Enables build-time safety, testability, and maintainability
tags: patterns, dependency-injection, di, ioctopus, moduleloader, testing, coupling
---

## Use Dependency Injection for Loose Coupling

**Impact: HIGH**

Dependency Injection enables loose coupling, facilitates testing, and isolates concerns. Dependencies should be injected via DI containers rather than instantiated directly within classes.

**Incorrect (tight coupling with direct instantiation):**

```typescript
class BookingService {
  private repository = new BookingRepository();
  private emailService = new EmailService();
  private calendarService = new GoogleCalendarService();

  async createBooking(data: CreateBookingDTO) {
    const booking = await this.repository.create(data);
    await this.emailService.sendConfirmation(booking);
    await this.calendarService.createEvent(booking);
    return booking;
  }
}
```

**Correct (dependency injection):**

```typescript
class BookingService {
  constructor(
    private readonly repository: BookingRepository,
    private readonly emailService: EmailService,
    private readonly calendarService: CalendarService,
  ) {}

  async createBooking(data: CreateBookingDTO) {
    const booking = await this.repository.create(data);
    await this.emailService.sendConfirmation(booking);
    await this.calendarService.createEvent(booking);
    return booking;
  }
}
```

**Required patterns:**
- **Application Services**: Orchestrate use cases, coordinate between domain services and repositories
- **Domain Services**: Contain business logic that doesn't naturally belong to a single entity
- **Repositories**: Abstract data access, isolate technology choices
- **Caching Proxies**: Wrap repositories or services to add caching behavior transparently
- **Decorators**: Add cross-cutting concerns (logging, metrics) without polluting domain logic

## Cal.com's Type-Safe DI with moduleLoader

We use `@evyweb/ioctopus` to manage service and repository dependencies. The **moduleLoader pattern** provides type-safe dependency injection, ensuring that if a service adds a new dependency, TypeScript will catch missing dependencies at build time rather than runtime.

### Core Concepts

**Tokens**: Unique symbols that identify each service or repository in the DI container. Every injectable class needs a corresponding token. Tokens should be defined in a `tokens.ts` file within the feature's `di/` directory.

**Modules** (`.module.ts` files): Define how classes are instantiated and what dependencies they require using the `bindModuleToClassOnToken` function. Each module exports a `moduleLoader` object that knows how to load itself and its dependencies.

**Containers** (`.container.ts` files): Create a container instance and expose getter functions that consumers use to obtain service instances. Containers use the moduleLoader to automatically load all required dependencies.

**`bindModuleToClassOnToken`**: A type-safe function that binds a class to a token and declares its dependencies. TypeScript ensures the declared dependencies match what the class constructor expects.

### How It Works

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
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MyRepository,
  dep: prismaModuleLoader,
});
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
import { getMyService } from "@calcom/features/myfeature/di/MyService.container";

const myService = getMyService();
await myService.doSomething();
```

## Common Mistakes to Avoid

**Mistake 1: Creating a repository or service class with all static methods**

```typescript
// Bad - Static methods bypass DI
export class BookingRepository {
  static async findById(id: string) {
    return prisma.booking.findUnique({ where: { id } });
  }
}

// Good - Instance methods with constructor injection
export class BookingRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: string) {
    return this.prismaClient.booking.findUnique({ where: { id } });
  }
}
```

**Mistake 2: Manually instantiating a class instead of using the DI container**

```typescript
// Bad - Manual instantiation bypasses DI
const bookingRepo = new BookingRepository(prisma);
const myService = new MyService({ bookingRepo });

// Good - Use the DI container's getter function
import { getMyService } from "@calcom/features/myfeature/di/MyService.container";
const myService = getMyService();
```

**Mistake 3: Importing Prisma directly in a service instead of using repository injection**

```typescript
// Bad - Service imports Prisma directly
import prisma from "@calcom/prisma";

export class MyService {
  async doSomething() {
    const bookings = await prisma.booking.findMany({...});
  }
}

// Good - Service depends on repository via DI
export class MyService {
  constructor(private deps: IMyServiceDeps) {}

  async doSomething() {
    const bookings = await this.deps.bookingRepo.findMany({...});
  }
}
```

**Mistake 4: Manual module loading in containers (not type-safe)**

```typescript
// Bad - Manual module loading is not type-safe
const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);

// Good - Use moduleLoader for type-safe dependency loading
export function getMyService(): MyService {
  myServiceModuleLoader.loadModule(container);
  return container.get<MyService>(myServiceModuleLoader.token);
}
```

## Why Use DI?

- **Build-time safety**: TypeScript catches missing dependencies before runtime
- **Testability**: Dependencies can be easily mocked in tests
- **Consistency**: All instances are created the same way with proper dependencies
- **Maintainability**: Changing a dependency only requires updating the module binding
- **Automatic dependency resolution**: The moduleLoader automatically loads all dependencies recursively
- **Self-documenting**: Each module declares its own dependencies explicitly

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
