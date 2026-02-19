# DatabaseProxy

Prisma wrapper with multi-tenant and read replica support. All tenant and replica configuration is unified under a single `DATABASE_TENANTS` env var.

## Quick Start

```typescript
import { prisma } from "@calcom/prisma";

// Primary database (default)
await prisma.user.findMany();

// Read replica (from _default tenant)
await prisma.replica("read").user.findMany();

// Tenant database
await prisma.tenant("acme").user.findMany();

// Tenant + replica
await prisma.tenant("acme").replica("read").user.findMany();
```

## Configuration

```bash
# Primary (required)
DATABASE_URL="postgresql://user:pass@primary:5432/calcom"

# Tenants (optional) — all replica config lives here
DATABASE_TENANTS='{
  "_default": {
    "replicas": { "read": "postgresql://primary-replica/db" }
  },
  "acme": {
    "primary": "postgresql://acme-primary/db",
    "replicas": { "read": "postgresql://acme-replica/db" }
  },
  "globex": {
    "primary": "postgresql://globex/db"
  }
}'
```

### `_default` tenant

The reserved `_default` key configures replicas for the primary database (`DATABASE_URL`). Its `primary` field is ignored — the primary always comes from `DATABASE_URL`.

```bash
DATABASE_TENANTS='{
  "_default": { "replicas": { "read": "postgresql://primary-replica/db" } }
}'
```

This makes `prisma.replica("read")` route to the primary database's read replica.

### Tenant without replicas

```bash
DATABASE_TENANTS='{
  "globex": { "primary": "postgresql://globex/db" }
}'
```

### Tenant with replicas

```bash
DATABASE_TENANTS='{
  "acme": {
    "primary": "postgresql://acme-primary/db",
    "replicas": { "read": "postgresql://acme-replica/db" }
  }
}'
```

## API

| Method | Description | Fallback |
|--------|-------------|----------|
| `prisma.replica(name)` | Read replica of primary database | Primary if not found |
| `prisma.tenant(name)` | Route to tenant database | Primary if not found |
| `prisma.tenant(name).replica(name)` | Tenant-specific replica | Tenant primary |

## Examples

### Read replicas for heavy queries

```typescript
// Expensive read → default replica
const bookings = await prisma.replica("read").booking.findMany({
  where: { createdAt: { gte: lastMonth } },
  select: { id: true, title: true, attendees: { select: { email: true } } },
});

// Writes → primary (always)
await prisma.booking.create({ data: { ... } });
```

### Multi-tenancy

```typescript
const acme = prisma.tenant("acme");

await acme.user.findMany();
await acme.booking.findMany();
await acme.replica("read").eventType.findMany();
```

### Request-based routing (Next.js)

```typescript
import { headers } from "next/headers";
import { resolveReplica } from "@calcom/lib/server/resolveReplica";
import { prisma } from "@calcom/prisma";

export async function GET() {
  const db = prisma.replica(resolveReplica(await headers()));

  return Response.json(await db.user.findMany());
}
```

### Domain-based tenant routing

```typescript
const TENANTS: Record<string, string> = {
  "acme.cal.com": "acme",
  "globex.cal.com": "globex",
};

function getDb(host: string) {
  return prisma.tenant(TENANTS[host]);
}
```

## Fallback Behavior

All methods gracefully fallback when target doesn't exist:

```typescript
prisma.replica("nonexistent")     // → primary
prisma.replica(null)              // → primary
prisma.replica("")                // → primary
prisma.tenant("nonexistent")      // → primary
prisma.tenant(undefined)          // → primary
prisma.tenant("x").replica("y")   // → tenant primary (if replica missing)
```

## Type Safety

Full TypeScript support with autocomplete:

```typescript
const user = await prisma.tenant("acme").replica("read").user.findFirst({
  where: { email: "test@example.com" },
  select: { id: true, name: true },
});
// user: { id: number; name: string | null } | null
```

## Troubleshooting

**Replica not used?** Check JSON syntax in `DATABASE_TENANTS`:
```bash
# Correct
DATABASE_TENANTS='{"_default":{"replicas":{"read":"postgresql://..."}}}'

# Wrong — missing quotes
DATABASE_TENANTS={_default:{replicas:{read:"postgresql://..."}}}
```

**Tenant not found?** Names are case-sensitive:
```typescript
prisma.tenant("acme")  // works
prisma.tenant("ACME")  // falls back to primary
```
