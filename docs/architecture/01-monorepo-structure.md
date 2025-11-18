# 📦 PHASE 1: Monorepo Structure & Build Pipeline

> **Mục tiêu**: Hiểu toàn diện cấu trúc monorepo cal.com, Turborepo build pipeline, workspaces, và development workflow.

---

## 📑 Mục lục

1. [Tổng quan Monorepo](#1-tổng-quan-monorepo)
2. [Workspace Topology](#2-workspace-topology)
3. [Apps - Ứng dụng chính](#3-apps---ứng-dụng-chính)
4. [Packages - Thư viện dùng chung](#4-packages---thư-viện-dùng-chung)
5. [Turborepo Build Pipeline](#5-turborepo-build-pipeline)
6. [Scripts & Development Workflow](#6-scripts--development-workflow)
7. [Dependency Graph](#7-dependency-graph)
8. [Best Practices](#8-best-practices)

---

## 1. Tổng quan Monorepo

Cal.com sử dụng **Yarn Workspaces + Turborepo** để quản lý monorepo quy mô lớn với:

- **3 main apps**: `web`, `api/v1`, `api/v2`
- **20+ core packages**: Prisma, tRPC, features, lib, ui, emails...
- **57 feature packages** trong `packages/features/*`
- **108 integration apps** trong `packages/app-store/*`
- **Platform packages** cho SDK và embed

### Kiến trúc tổng thể

```
cal.com/
├── apps/                    # Ứng dụng chính (deployable)
│   ├── web/                # Next.js app (main UI)
│   ├── api/
│   │   ├── v1/            # API v1 (tRPC wrapper)
│   │   └── v2/            # API v2 (NestJS)
│   └── ui-playground/     # Storybook/component dev
│
├── packages/               # Shared libraries
│   ├── prisma/            # Database schema & client
│   ├── trpc/              # tRPC routers & procedures
│   ├── features/          # 57 domain features
│   ├── app-store/         # 108 integrations
│   ├── lib/               # Utilities
│   ├── ui/                # UI components
│   ├── emails/            # Email templates
│   ├── platform/          # Platform SDK
│   ├── embeds/            # Embed libraries
│   └── ...                # 15+ other packages
│
├── turbo.json             # Turborepo pipeline config
├── package.json           # Root workspace config
└── yarn.lock              # Yarn 3.4.1 lockfile
```

---

## 2. Workspace Topology

### 2.1. Workspace Configuration

File: `package.json` (root)

```json
{
  "name": "calcom-monorepo",
  "version": "0.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "apps/api/*",
    "packages/*",
    "packages/embeds/*",
    "packages/features/*",
    "packages/app-store",
    "packages/app-store/*",
    "packages/platform/*",
    "packages/platform/examples/base",
    "example-apps/*"
  ]
}
```

**Workspace patterns**:
- `apps/*` - Tất cả apps trong `/apps`
- `apps/api/*` - API apps (v1, v2) trong `/apps/api`
- `packages/*` - Core packages
- `packages/features/*` - 57 feature packages độc lập
- `packages/app-store/*` - 108 integration apps
- `packages/embeds/*` - Embed libraries (core, react, snippet)
- `packages/platform/*` - Platform SDK packages

### 2.2. Package Manager

- **Yarn 3.4.1** (PnP mode disabled, sử dụng node_modules)
- Engine requirement: `>= 7.0.0` cho npm, `3.4.1` cho yarn
- Lockfile: `yarn.lock`

---

## 3. Apps - Ứng dụng chính

### 3.1. `@calcom/web` - Main Web Application

**Location**: `apps/web/`
**Type**: Next.js 15.5.4 (App Router + Pages Router hybrid)
**Port**: 3000 (default)

#### Package Info
```json
{
  "name": "@calcom/web",
  "version": "5.9.0",
  "private": true
}
```

#### Key Features
- **Next.js App Router** (`app/` directory)
  - Route groups: `(booking-page-wrapper)`, `(use-page-wrapper)`
  - Server Components, RSC
  - Middleware for routing logic

- **Next.js Pages Router** (`pages/` directory)
  - Legacy routes
  - API routes (`pages/api/`)
  - tRPC endpoint: `pages/api/trpc/[trpc].ts`

- **SSR/SSG/ISR** support
- **i18n**: next-i18next with multiple locales
- **Instrumentation**: Sentry, PostHog analytics
- **Embed support**: iframe, popup, modal modes

#### Key Dependencies (workspace)
```json
"@calcom/app-store": "workspace:*",
"@calcom/dayjs": "workspace:*",
"@calcom/embed-core": "workspace:*",
"@calcom/embed-react": "workspace:*",
"@calcom/features": "workspace:*",
"@calcom/lib": "workspace:*",
"@calcom/prisma": "workspace:*",
"@calcom/trpc": "workspace:*",
"@calcom/ui": "workspace:*"
```

#### Scripts
| Script | Mô tả |
|--------|-------|
| `dev` | Dev server với Turbopack |
| `dx` | Alias cho `dev` |
| `build` | Production build (includes Sentry release) |
| `start` | Start production server |
| `copy-app-store-static` | Copy static assets từ app-store |
| `type-check` | TypeScript type checking |

#### File Structure
```
apps/web/
├── app/                      # Next.js App Router
│   ├── (booking-page-wrapper)/
│   ├── (use-page-wrapper)/
│   ├── api/                 # App Router API routes
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
│
├── pages/                   # Next.js Pages Router
│   ├── api/                 # API routes
│   │   ├── trpc/[trpc].ts  # tRPC handler
│   │   └── auth/[...nextauth].ts
│   ├── _app.tsx
│   └── _document.tsx
│
├── components/              # UI components
├── lib/                     # Utilities
├── modules/                 # Feature modules
├── middleware.ts            # Next.js middleware
├── next.config.js
└── package.json
```

---

### 3.2. `@calcom/api-v2` - Platform API (NestJS)

**Location**: `apps/api/v2/`
**Type**: NestJS REST API
**Port**: 5555 (default)

#### Package Info
```json
{
  "name": "@calcom/api-v2",
  "version": "0.0.1",
  "description": "Platform API for Cal.com",
  "private": true
}
```

#### Architecture
- **NestJS modules**: Controllers, Services, Guards
- **Swagger/OpenAPI** documentation
- **JWT authentication**
- **Rate limiting** (Redis + Throttler)
- **Bull queues** for async jobs
- **Sentry** error tracking

#### Key Dependencies (workspace)
```json
"@calcom/platform-constants": "workspace:*",
"@calcom/platform-enums": "workspace:*",
"@calcom/platform-libraries": "workspace:*",
"@calcom/platform-types": "workspace:*",
"@calcom/platform-utils": "workspace:*",
"@calcom/prisma": "workspace:*"
```

#### External Dependencies
- `@nestjs/core`, `@nestjs/common` v10
- `@nestjs/swagger` - API docs
- `@nestjs/bull` - Job queues
- `@nestjs/throttler` - Rate limiting
- `ioredis` - Redis client
- `class-validator`, `class-transformer` - DTO validation

#### Scripts
| Script | Mô tả |
|--------|-------|
| `dev` | Dev server với watch mode |
| `dev:build` | Build platform packages |
| `dev:build:watch` | Watch mode cho platform packages |
| `build` | Production build |
| `start:prod` | Start production server |
| `test:e2e` | E2E tests |
| `generate-swagger` | Generate OpenAPI schema |

#### File Structure
```
apps/api/v2/
├── src/
│   ├── modules/            # NestJS modules (bookings, users, etc.)
│   ├── ee/                 # Enterprise features
│   ├── guards/             # Auth guards
│   ├── filters/            # Exception filters
│   ├── interceptors/       # Response interceptors
│   ├── swagger/            # OpenAPI generation
│   └── main.ts             # App entry point
│
├── test/                   # E2E tests
├── nest-cli.json
└── package.json
```

---

### 3.3. `@calcom/api` (v1) - Legacy API

**Location**: `apps/api/v1/`
**Type**: tRPC-based REST wrapper
**Status**: Legacy (being phased out)

#### Package Info
- Wraps tRPC procedures as REST endpoints
- Used by older integrations
- Gradually migrating to v2

---

### 3.4. `@calcom/ui-playground`

**Location**: `apps/ui-playground/`
**Type**: Storybook component development

- Component documentation
- Visual testing
- Design system playground

---

## 4. Packages - Thư viện dùng chung

### 4.1. Core Infrastructure Packages

#### `@calcom/prisma`
**Location**: `packages/prisma/`
**Purpose**: Database schema, migrations, client

- **Schema**: `schema.prisma` với 105 models
- **Generators**:
  - Prisma Client → `generated/prisma/`
  - Zod schemas → `zod/`
  - Kysely types → `kysely/types.ts`
  - Custom enums → `enum-generator.ts`
- **Scripts**:
  - `db-migrate`: Run migrations
  - `db-seed`: Seed database
  - `db-studio`: Prisma Studio GUI
  - `post-install`: Generate client + Zod schemas

**Key files**:
```
packages/prisma/
├── schema.prisma           # Main schema (105 models)
├── migrations/             # Migration history
├── seed.ts                 # Seed script
├── generated/
│   └── prisma/            # Prisma Client
├── zod/                   # Zod validators (auto-generated)
└── kysely/                # Kysely types
```

---

#### `@calcom/trpc`
**Location**: `packages/trpc/`
**Purpose**: tRPC routers, procedures, middleware

- **Server**: `server/routers/`, `server/procedures/`, `server/middlewares/`
- **Client**: React Query hooks
- **Version**: tRPC v11 beta
- **Routers**:
  - `viewer/` - Authenticated user routes (35+ sub-routers)
  - `loggedInViewer/` - SSR-safe authenticated routes
  - `publicViewer/` - Public routes (no auth)

**Key files**:
```
packages/trpc/
├── server/
│   ├── routers/
│   │   ├── viewer/          # Main authenticated router
│   │   ├── loggedInViewer/  # SSR-safe router
│   │   └── publicViewer/    # Public router
│   ├── procedures/          # Base procedures
│   ├── middlewares/         # Auth, feature flags, etc.
│   ├── createContext.ts     # Context builder
│   └── trpc.ts              # tRPC instance
│
└── react/                  # React Query hooks
```

---

#### `@calcom/lib`
**Location**: `packages/lib/`
**Purpose**: Shared utilities, helpers, constants

- Date/time utilities
- Validation helpers
- API clients (Sendgrid, Formbricks, etc.)
- Rate limiting (Unkey)
- Image processing (Sharp, Jimp)
- Cal/DAV client (tsdav)

**Dependencies**:
- `@calcom/dayjs` - Date utilities
- `@calcom/config` - Configuration
- `city-timezones` - Timezone data
- `rrule` - Recurring events
- `sharp` - Image optimization
- `tsdav` - CalDAV/CardDAV

---

#### `@calcom/ui`
**Location**: `packages/ui/`
**Purpose**: Design system, reusable UI components

- **Components**: 50+ components (Button, Dialog, Form, Table...)
- **Radix UI**: Base primitives (@radix-ui/*)
- **Tailwind CSS**: Styling
- **Icon system**: Lucide icons + custom sprite builder

**Exports** (package.json):
```json
"./components/button": "./components/button/index.ts",
"./components/dialog": "./components/dialog/index.ts",
"./components/form": "./components/form/index.ts",
"./components/table": "./components/table/index.ts",
// ... 50+ components
```

**Scripts**:
- `build:icons` - Generate icon sprite from Lucide

---

### 4.2. Feature Packages

**Location**: `packages/features/`
**Count**: 57 feature packages

Mỗi feature là một package độc lập với domain logic riêng:

```
packages/features/
├── auth/                   # Authentication & session
├── bookings/              # Booking creation, reschedule, cancel
├── calendars/             # Calendar sync (Google, Outlook, Apple...)
├── ee/                    # Enterprise features (21 sub-packages)
│   ├── organizations/     # Multi-tenant orgs
│   ├── sso/              # SAML, OIDC
│   ├── workflows/        # Automation workflows
│   ├── insights/         # Analytics
│   └── ...
├── eventtypes/           # Event type management
├── schedules/            # Availability schedules
├── webhooks/             # Webhook management
├── users/                # User management
├── teams/                # Team features
├── apps/                 # App management UI
├── embed/                # Embed functionality
└── ...                   # 35+ other features
```

**Pattern**: Mỗi feature có:
- `lib/` - Business logic
- `components/` - UI components (nếu có)
- `server/` - tRPC procedures (nếu có)
- `package.json` - Dependencies

---

### 4.3. App Store Packages

**Location**: `packages/app-store/`
**Count**: 108 integration apps

#### App Categories
1. **Calendar** (15 apps): Google, Outlook, Apple, CalDAV...
2. **Video** (10 apps): Zoom, Google Meet, Daily.co, MS Teams...
3. **Payment** (5 apps): Stripe, PayPal, Alipay, Razorpay...
4. **CRM** (8 apps): Salesforce, HubSpot, Close.com, Pipedrive...
5. **Analytics** (5 apps): GA4, Fathom, Plausible, Umami...
6. **Messaging** (3 apps): Slack, MS Teams, Discord...
7. **Automation** (5 apps): Zapier, Make, n8n...
8. **Other** (57 apps): Giphy, Vital, Routing Forms, etc.

#### App Structure Pattern
```
packages/app-store/{app-name}/
├── config.json             # App metadata
├── package.json            # Dependencies
├── api/                    # API handlers (OAuth, webhook...)
├── lib/                    # Business logic
├── components/             # UI components
├── pages/                  # Setup/config pages
├── static/                 # Icons, images
└── README.md
```

#### App Store CLI
**Location**: `packages/app-store-cli/`

Scripts để quản lý apps:
```bash
yarn create-app <name>           # Tạo app mới
yarn edit-app <name>             # Sửa app metadata
yarn delete-app <name>           # Xóa app
yarn app-store:build            # Build app registry
```

**Generated files**:
- `packages/app-store/apps.generated.ts` - App registry
- `packages/app-store/apps.browser.generated.tsx` - Browser bundle

---

### 4.4. Platform Packages

**Location**: `packages/platform/`

Packages cho Platform SDK (API v2):

```
packages/platform/
├── constants/              # @calcom/platform-constants
├── enums/                  # @calcom/platform-enums
├── libraries/              # @calcom/platform-libraries
├── types/                  # @calcom/platform-types
└── utils/                  # @calcom/platform-utils
```

Sử dụng bởi `apps/api/v2` (NestJS).

---

### 4.5. Embed Packages

**Location**: `packages/embeds/`

```
packages/embeds/
├── embed-core/             # Vanilla JS embed library
├── embed-react/            # React wrapper
└── embed-snippet/          # Snippet generator
```

**Build output**:
- `apps/web/public/embed/embed.js` - Embed script
- Được serve từ `https://{domain}/embed/embed.js`

---

### 4.6. Supporting Packages

| Package | Purpose |
|---------|---------|
| `@calcom/dayjs` | Dayjs wrapper với timezone plugins |
| `@calcom/emails` | Email templates (React Email) |
| `@calcom/config` | Shared configuration |
| `@calcom/types` | TypeScript types |
| `@calcom/tsconfig` | Shared tsconfig |
| `@calcom/eslint-config` | ESLint rules |
| `@calcom/debugging` | Debug utilities |
| `@calcom/kysely` | Kysely database client |
| `@calcom/sms` | SMS providers (Twilio, etc.) |

---

## 5. Turborepo Build Pipeline

File: `turbo.json`

### 5.1. Pipeline Tasks

Turborepo định nghĩa dependency graph giữa các tasks:

```
build
  ↓
@calcom/web#build
  ↓ dependsOn: ^build
@calcom/trpc#build → @calcom/prisma#build → post-install
```

### 5.2. Key Tasks

#### `post-install`
Chạy sau `yarn install`:
```json
{
  "post-install": {
    "dependsOn": [],
    "outputs": [
      "../../node_modules/@prisma/client/**",
      "../../node_modules/@prisma/admin-client/**"
    ],
    "inputs": ["./schema.prisma", "./prisma/schema.prisma"],
    "env": ["PRISMA_GENERATE_DATAPROXY"]
  }
}
```

**Mục đích**: Generate Prisma Client + Zod schemas

---

#### `@calcom/web#build`
Build main web app:
```json
{
  "@calcom/web#build": {
    "dependsOn": ["^build"],
    "outputs": [".next/**"],
    "env": [
      "NEXT_PUBLIC_WEBAPP_URL",
      "NEXT_PUBLIC_WEBSITE_URL",
      "SENTRY_AUTH_TOKEN",
      // ... 40+ env vars
    ]
  }
}
```

**Dependency**: `^build` - tất cả packages phải build trước

---

#### `@calcom/web#copy-app-store-static`
Copy static assets từ app-store:
```json
{
  "@calcom/web#copy-app-store-static": {
    "inputs": ["../../packages/app-store/**/static/**/*"],
    "outputLogs": "new-only",
    "outputs": ["public/app-store/**"]
  }
}
```

Copy icons/images từ 108 apps vào `public/app-store/`.

---

#### `@calcom/prisma#db-migrate`
Database migration:
```json
{
  "@calcom/prisma#db-migrate": {
    "cache": false,
    "dependsOn": ["@calcom/prisma#db-up"],
    "inputs": ["./schema.prisma", "./migrations/**/*.sql"]
  }
}
```

---

#### `@calcom/embed-core#build`
Build embed library:
```json
{
  "@calcom/embed-core#build": {
    "cache": false,
    "outputs": ["../../../apps/web/public/embed/**"],
    "env": [
      "EMBED_PUBLIC_VERCEL_URL",
      "EMBED_PUBLIC_WEBAPP_URL",
      "EMBED_PUBLIC_EMBED_FINGER_PRINT",
      "EMBED_PUBLIC_EMBED_VERSION"
    ]
  }
}
```

Output embed.js vào `apps/web/public/embed/`.

---

### 5.3. Global Dependencies

```json
{
  "globalDependencies": ["yarn.lock"]
}
```

Cache invalidation khi `yarn.lock` thay đổi.

---

### 5.4. Global Environment Variables

283+ environment variables được track:
- `DATABASE_URL`, `DATABASE_DIRECT_URL`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Integration credentials (Google, Zoom, Stripe...)
- Feature flags
- API keys
- Deployment configs (Vercel, Railway, Heroku)

---

### 5.5. Caching Strategy

Turborepo cache mặc định:
- **Local cache**: `.turbo/` folder
- **Remote cache**: Vercel (nếu config)

**Cache miss triggers**:
- Input files thay đổi
- `yarn.lock` thay đổi
- Env vars thay đổi
- Dependencies rebuild

---

## 6. Scripts & Development Workflow

### 6.1. Root Scripts

File: `package.json` (root)

#### Development
```bash
# Start web app dev server
yarn dev                    # = turbo run dev --filter="@calcom/web"

# Start với database setup
yarn dx                     # = turbo run dx

# Start multiple apps
yarn dev:all               # web + website + console
yarn dev:api               # web + api-proxy + api
yarn dev:ai                # web + api-proxy + api + ai
```

#### Build
```bash
# Build web app (production)
yarn build                 # = turbo run build --filter=@calcom/web...

# Build specific app
yarn build:ai              # = turbo run build --filter="@calcom/ai"
```

#### Database
```bash
# Deploy migrations
yarn db-deploy             # = turbo run db-deploy

# Seed database
yarn db-seed               # = turbo run db-seed

# Prisma Studio
yarn db-studio             # = yarn prisma studio

# Direct Prisma CLI
yarn prisma <command>      # = yarn workspace @calcom/prisma prisma <command>
```

#### Testing
```bash
# Unit tests (Vitest)
yarn test                  # = TZ=UTC vitest run
yarn tdd                   # = vitest watch
yarn test:ui               # = vitest --ui

# E2E tests (Playwright)
yarn e2e                   # @calcom/web project
yarn e2e:app-store         # App store tests
yarn e2e:embed             # Embed tests
yarn test-e2e              # Seed + E2E
```

#### Type Checking & Linting
```bash
# Type check
yarn type-check            # = turbo run type-check
yarn type-check:ci         # With absolute paths

# Lint
yarn lint                  # = turbo lint
yarn lint:fix              # = turbo lint:fix
yarn lint:report           # JSON report
```

#### App Store Management
```bash
# App store CLI
yarn create-app            # Create new integration
yarn edit-app              # Edit app metadata
yarn delete-app            # Delete app
yarn app-store:build       # Build app registry
```

---

### 6.2. Development Workflows

#### 6.2.1. Setup từ đầu

```bash
# 1. Clone repo
git clone https://github.com/calcom/cal.com.git
cd cal.com

# 2. Install dependencies
yarn

# 3. Setup environment
cp .env.example .env
# Edit .env: DATABASE_URL, NEXTAUTH_SECRET...

# 4. Setup database
yarn dx                     # = db-up + db-migrate + db-seed

# 5. Start dev server
yarn dev                    # Port 3000
```

**Duration**: ~5-10 phút (tùy network & hardware)

---

#### 6.2.2. Development Loop

```bash
# Terminal 1: Dev server
yarn dev

# Terminal 2: Database GUI (optional)
yarn db-studio

# Terminal 3: Type checking (optional)
yarn workspace @calcom/web type-check --watch
```

**Hot reload**:
- Next.js Turbopack: Fast refresh
- tRPC: Auto-reload on router changes
- Prisma: Regenerate on schema changes

---

#### 6.2.3. Adding a New Feature

```bash
# 1. Create feature package (if needed)
mkdir packages/features/my-feature
cd packages/features/my-feature
yarn init

# 2. Add to workspace (auto-detected)

# 3. Develop feature

# 4. Type check
yarn type-check

# 5. Test
yarn test

# 6. Build
yarn build
```

---

#### 6.2.4. Adding a New Integration

```bash
# 1. Scaffold app
yarn create-app my-integration

# 2. Fill in metadata
yarn edit-app my-integration

# 3. Implement handlers
# Edit packages/app-store/my-integration/api/

# 4. Rebuild registry
yarn app-store:build

# 5. Test
yarn dev
```

---

## 7. Dependency Graph

### 7.1. Workspace Dependencies

```
@calcom/web
├── @calcom/prisma
├── @calcom/trpc
│   └── @calcom/prisma
├── @calcom/features
│   ├── @calcom/prisma
│   ├── @calcom/lib
│   └── @calcom/ui
├── @calcom/lib
│   ├── @calcom/dayjs
│   └── @calcom/config
├── @calcom/ui
│   └── @calcom/lib
├── @calcom/app-store
│   ├── @calcom/prisma
│   ├── @calcom/lib
│   └── @calcom/ui
└── @calcom/embed-core
```

```
@calcom/api-v2
├── @calcom/prisma
├── @calcom/platform-constants
├── @calcom/platform-enums
├── @calcom/platform-libraries
│   ├── @calcom/prisma
│   └── @calcom/platform-types
├── @calcom/platform-types
└── @calcom/platform-utils
```

---

### 7.2. Build Order

Turborepo tự động xác định thứ tự build:

```
1. post-install (no deps)
   ├── @calcom/prisma#post-install
   └── Generate: Prisma Client, Zod, Kysely

2. @calcom/config (no deps)
3. @calcom/dayjs (no deps)
4. @calcom/types (no deps)

5. @calcom/lib (deps: config, dayjs)

6. @calcom/trpc#build
   └── Generate tRPC types

7. @calcom/ui (deps: lib)

8. @calcom/features (deps: lib, ui, prisma)

9. @calcom/app-store-cli#build
   └── Generate app registry

10. @calcom/embed-core#build
    └── Output to web/public/embed/

11. @calcom/web#build (deps: ^build)
    └── Next.js build
```

**Parallel execution**: Tasks không phụ thuộc chạy song song.

---

## 8. Best Practices

### 8.1. Quy tắc Workspace

1. **Package naming**: `@calcom/<name>`
2. **Private packages**: `"private": true` (không publish npm)
3. **Workspace protocol**: `"workspace:*"` cho internal deps
4. **Version pinning**: Dùng exact versions cho critical deps

---

### 8.2. Turborepo Best Practices

1. **Cache granularity**: Mỗi task có inputs/outputs rõ ràng
2. **Env tracking**: List tất cả env vars ảnh hưởng build
3. **Incremental builds**: Chỉ rebuild packages thay đổi
4. **Remote caching**: Enable cho team (Vercel/self-hosted)

---

### 8.3. Development Tips

1. **Filter workspaces**:
   ```bash
   # Chỉ build web
   turbo build --filter=@calcom/web

   # Build web và deps
   turbo build --filter=@calcom/web...

   # Build packages thay đổi (since main)
   turbo build --filter=[origin/main]
   ```

2. **Skip cache**:
   ```bash
   turbo build --force
   ```

3. **Dry run**:
   ```bash
   turbo build --dry-run
   ```

4. **Graph visualization**:
   ```bash
   turbo run build --graph=graph.html
   ```

---

### 8.4. Debugging Workspace Issues

#### Issue: Package not found
```bash
# Verify workspace detection
yarn workspaces list

# Reinstall
rm -rf node_modules .yarn/cache
yarn
```

#### Issue: Circular dependencies
```bash
# Analyze deps
yarn why <package>

# Check workspace graph
turbo run build --dry-run
```

#### Issue: Prisma client out of sync
```bash
# Regenerate
yarn workspace @calcom/prisma generate-schemas

# Or force rebuild
turbo run post-install --force
```

---

## 📝 Thay đổi trong PHASE 1

✅ **Đã hoàn thành**:
- Phân tích toàn bộ monorepo structure
- Map 3 main apps + 20+ packages
- Document Turborepo pipeline
- List 283+ env vars
- Explain build order & caching
- Development workflows

**Files được tạo**:
- `docs/architecture/01-monorepo-structure.md` (tài liệu này)

---

## 👉 Gợi ý Phase tiếp theo

**PHASE 2: Prisma Data Layer & Domain Models**

Sẽ đi sâu vào:
- 105 Prisma models
- Database relationships
- Generated artifacts (Client, Zod, Kysely)
- Migration strategy
- Seed data

Khi sẵn sàng, chạy:
```bash
# User nói: "OK, chạy PHASE 2"
```
