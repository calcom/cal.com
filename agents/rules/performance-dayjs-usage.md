---
title: Day.js Performance Guidelines
impact: HIGH
impactDescription: Significant performance improvement in date-heavy operations
tags: performance, dates, dayjs
---

## Day.js Performance Guidelines

**Impact: HIGH (Significant performance improvement in date-heavy operations)**

Day.js with the `@calcom/dayjs` wrapper is heavy because it pre-loads all plugins including locale handling. Use alternatives when strict timezone awareness isn't required.

**Incorrect (using Day.js unnecessarily):**

```typescript
// Slow in performance-critical code (loops)
dates.map((date) => dayjs(date).add(1, "day").format());

// Using Dayjs for simple date operations
const startOfMonth = dayjs().startOf("month");
```

**Correct (using performant alternatives):**

```typescript
// Use .utc() for better performance when timezone doesn't matter
dates.map((date) => dayjs.utc(date).add(1, "day").format());

// Use native Date when possible
dates.map((date) => new Date(date.valueOf() + 24 * 60 * 60 * 1000));

// Use date-fns for simple operations
import { startOfMonth, endOfDay } from "date-fns";
const monthStart = startOfMonth(dateObj);
const dayEnd = endOfDay(dateObj);

// For browser locale, use Intl with i18n
const { i18n: { language } } = useLocale();
new Intl.DateTimeFormat(language).format(date);
```

**When to use Day.js:**
- When you need strict timezone awareness (e.g., in the Booker)
- When working with complex timezone conversions
- When the performance impact is negligible (non-loop operations)

**When to avoid Day.js:**
- Simple date arithmetic
- Date formatting without timezone concerns
- Performance-critical loops over dates

Reference: [Cal.com Engineering Standards](https://cal.com/blog/engineering-in-2026-and-beyond)
