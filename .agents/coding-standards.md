# Coding Standards & Best Practices



## Import Guidelines

### Type Imports

```typescript
// ✅ Good - Use type imports for TypeScript types
import type { User } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

// ❌ Bad - Regular import for types
import { User } from "@prisma/client";
```



## Code Structure

### Early Returns

- Prefer early returns to reduce nesting: `if (!booking) return null;`

### Composition Over Prop Drilling

- Use React children and context instead of passing props through multiple components

### Security Rules

```typescript
// ❌ NEVER expose credential keys
const user = await prisma.user.findFirst({
  select: {
    credentials: {
      select: {
        key: true, // ❌ NEVER do this
      }
    }
  }
});

// ✅ Good - Never select credential.key field
const user = await prisma.user.findFirst({
  select: {
    credentials: {
      select: {
        id: true,
        type: true,
        // key field is excluded for security
      }
    }
  }
});
```
