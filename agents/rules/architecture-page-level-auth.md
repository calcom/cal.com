---
title: Page-Level Authorization Checks in Next.js
impact: CRITICAL
impactDescription: Prevents unauthorized access to sensitive data
tags: security, nextjs, authorization, architecture
---

## Page-Level Authorization Checks in Next.js

**Impact: CRITICAL (Prevents unauthorized access to sensitive data)**

Authorization checks must be performed in `page.tsx` or server components, never in `layout.tsx`. Layouts don't intercept all requests and can be bypassed.

**Incorrect (auth checks in layout):**

```tsx
// app/admin/layout.tsx - DON'T DO THIS
export default async function AdminLayout({ children }) {
  const session = await getUserSession();
  if (!session?.user.role === "admin") {
    redirect("/");
  }
  return <div>{children}</div>;
}
```

**Correct (auth checks in page):**

```tsx
// app/admin/page.tsx
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getUserSession();

  if (!session || session.user.role !== "admin") {
    redirect("/"); // Or show an error
  }

  // Protected content here
  return <div>Welcome, Admin!</div>;
}
```

**Why layouts are unsafe for auth:**
- Layouts don't intercept all requests (direct navigation, refreshes)
- APIs and server actions bypass layouts entirely
- Risk of data leaks if layout check is skipped

**Key rules:**
- Check permissions inside every restricted `page.tsx`
- Validate session/user/role before querying sensitive data
- Redirect or return nothing to unauthorized users before running restricted code

Reference: [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/authentication)
