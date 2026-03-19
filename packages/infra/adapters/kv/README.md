# @calcom/kv

Pluggable key-value store adapters with TTL support.

## Usage

```typescript
import { createKVAdapter } from "@calcom/kv/createKVAdapter";
import type { KVAdapter } from "@calcom/kv/KVAdapter";

const kv = createKVAdapter({ provider: "redis", url: "redis://localhost:6379" });

await kv.put("key", "value", 3600); // TTL in seconds
const value = await kv.get("key");  // "value" | null
await kv.delete("key");
```

## Providers

| Provider | Transport | Config | Use case |
|----------|-----------|--------|----------|
| `redis` | TCP (ioredis) | `{ url }` | Traditional Redis deployments |
| `upstash` | REST (fetch) | `{ url, token }` | Serverless / edge environments |
| `cloudflare` | REST (fetch) | `{ accountId, namespaceId, apiToken }` | Cloudflare Workers KV |
| `memory` | In-process Map | none | Local dev, tests |
| `noop` | Discards all | none | Disable KV without code changes |

## Examples

```typescript
// Redis TCP
const redis = createKVAdapter({
  provider: "redis",
  url: process.env.REDIS_URL!,
});

// Upstash REST
const upstash = createKVAdapter({
  provider: "upstash",
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cloudflare Workers KV
const cf = createKVAdapter({
  provider: "cloudflare",
  accountId: process.env.CF_ACCOUNT_ID!,
  namespaceId: process.env.CF_KV_NAMESPACE_ID!,
  apiToken: process.env.CF_API_TOKEN!,
});

// In-memory (local dev / tests)
const mem = createKVAdapter({ provider: "memory" });

// Multiple instances of the same provider
const calendarCache = createKVAdapter({ provider: "redis", url: process.env.CALENDAR_CACHE_REDIS_URL! });
const tenantRouting = createKVAdapter({ provider: "redis", url: process.env.TENANT_ROUTING_REDIS_URL! });
```

## Tests

```bash
TZ=UTC npx vitest run packages/infra/adapters/kv/src/__tests__/
```
