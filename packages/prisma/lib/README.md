# Slow Query Monitoring

This module provides functionality to monitor slow Prisma database queries.

## Functionality

- **Detects Slow Queries:** Identifies queries exceeding a predefined threshold (default: 500ms).
- **Logs Warnings:** Logs a warning message to the console using the application logger.
- **Redacts Sensitive Data:** Automatically redacts potentially sensitive fields in the query parameters before logging or reporting.
- **Reports to Sentry:** Sends a message to Sentry with details about the slow query, including the query itself, redacted parameters, duration, and threshold.

## Configuration

- **Threshold:** The slow query threshold can be configured via the environment variable `PRISMA_SLOW_QUERY_THRESHOLD_MS`. If not set, it defaults to 500 milliseconds.

## Usage

The primary export is the `setupSlowQueryMonitoring` function. Import it and pass your Prisma client instance to it:

```typescript
import { PrismaClient } from "@prisma/client";

import { setupSlowQueryMonitoring } from "./lib/slow-query-monitoring";

const prisma = new PrismaClient();
setupSlowQueryMonitoring(prisma);

// Now your prisma instance will automatically monitor and report slow queries.
```
