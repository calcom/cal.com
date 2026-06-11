# Trevo SDK Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Trevo experiments SDK (`@trevosdk/browser@0.1.14`) into `apps/web` — init on app load, identify on sign-in, and a vendor-isolating wrapper exposing `getTrevoVariant`/`trackTrevoEvent`.

**Architecture:** A plain TypeScript wrapper module (`apps/web/modules/trevo/lib/trevo.ts`) owns all `@trevosdk/browser` calls behind no-op guards (missing env key, uninitialized, SDK throw). A `"use client"` `TrevoProvider` calls `initTrevo()` on mount and `identifyTrevoUser()` when a next-auth session appears; it mounts inside `SessionProvider` in `apps/web/app/providers.tsx` so it loads on every page including booking pages and embeds.

**Tech Stack:** Next.js App Router, next-auth (`useSession`), Vitest + jsdom + @testing-library/react, `@calcom/lib/logger`.

**Spec:** `docs/superpowers/specs/2026-06-11-trevo-sdk-setup-design.md`

**Relevant SDK API** (from `@trevosdk/browser` dist/index.d.ts — default export is a singleton):
- `init(options: { apiKey: string }): void` — re-entrant
- `identify(userId: string): void`
- `getVariant(experimentKey: string): string`
- `track(eventName: string, properties?: Record<string, unknown>): void`

---

### Task 1: Dependency + environment variable plumbing

**Files:**
- Modify: `apps/web/package.json` (dependencies block)
- Modify: `.env.example:87-90` (after the Posthog block)
- Modify: `turbo.json:243` and `turbo.json:456` (after both `NEXT_PUBLIC_POSTHOG_HOST` entries)

- [ ] **Step 1: Add the dependency**

In `apps/web/package.json`, add to `dependencies`, in alphabetical order among the `@`-scoped packages (after the `@stripe/*` entries region — keep the list sorted):

```json
"@trevosdk/browser": "0.1.14",
```

- [ ] **Step 2: Install**

Run: `yarn install`
Expected: completes without errors; `yarn.lock` updated with `@trevosdk/browser@0.1.14`.

- [ ] **Step 3: Declare the env var in `.env.example`**

After the Posthog block (`NEXT_PUBLIC_POSTHOG_HOST=` around line 90), add:

```bash
# Trevo experiments SDK (leave empty to disable)
NEXT_PUBLIC_TREVO_SDK_KEY=
```

- [ ] **Step 4: Declare the env var in `turbo.json`**

There are TWO lists containing `"NEXT_PUBLIC_POSTHOG_HOST"` (≈ lines 243 and 456). After EACH occurrence, add:

```json
"NEXT_PUBLIC_TREVO_SDK_KEY",
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json yarn.lock .env.example turbo.json
git commit -m "feat: add @trevosdk/browser dependency and NEXT_PUBLIC_TREVO_SDK_KEY env var"
```

---

### Task 2: Trevo wrapper module (TDD)

**Files:**
- Create: `apps/web/modules/trevo/lib/trevo.test.ts`
- Create: `apps/web/modules/trevo/lib/trevo.ts`

The wrapper holds module-level state (`initialized`, `identifiedUserId`). Tests reset it via `vi.resetModules()` + dynamic import per test.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/modules/trevo/lib/trevo.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSdk = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  getVariant: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@trevosdk/browser", () => ({ default: mockSdk }));

vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ error: vi.fn(), warn: vi.fn() }) },
}));

async function importTrevo() {
  return await import("./trevo");
}

describe("trevo wrapper", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_TREVO_SDK_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("initTrevo", () => {
    it("initializes the SDK with the env API key", async () => {
      const { initTrevo } = await importTrevo();
      initTrevo();
      expect(mockSdk.init).toHaveBeenCalledWith({ apiKey: "test-key" });
    });

    it("no-ops when NEXT_PUBLIC_TREVO_SDK_KEY is unset", async () => {
      vi.stubEnv("NEXT_PUBLIC_TREVO_SDK_KEY", "");
      const { initTrevo } = await importTrevo();
      initTrevo();
      expect(mockSdk.init).not.toHaveBeenCalled();
    });

    it("is idempotent across repeated calls", async () => {
      const { initTrevo } = await importTrevo();
      initTrevo();
      initTrevo();
      expect(mockSdk.init).toHaveBeenCalledTimes(1);
    });

    it("does not mark itself initialized when the SDK throws", async () => {
      mockSdk.init.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      const { initTrevo, trackTrevoEvent } = await importTrevo();
      initTrevo();
      trackTrevoEvent("event");
      expect(mockSdk.track).not.toHaveBeenCalled();
    });
  });

  describe("identifyTrevoUser", () => {
    it("no-ops before init", async () => {
      const { identifyTrevoUser } = await importTrevo();
      identifyTrevoUser("42");
      expect(mockSdk.identify).not.toHaveBeenCalled();
    });

    it("identifies the user after init", async () => {
      const { initTrevo, identifyTrevoUser } = await importTrevo();
      initTrevo();
      identifyTrevoUser("42");
      expect(mockSdk.identify).toHaveBeenCalledWith("42");
    });

    it("is idempotent for the same user id", async () => {
      const { initTrevo, identifyTrevoUser } = await importTrevo();
      initTrevo();
      identifyTrevoUser("42");
      identifyTrevoUser("42");
      expect(mockSdk.identify).toHaveBeenCalledTimes(1);
    });

    it("swallows and logs SDK errors", async () => {
      mockSdk.identify.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      const { initTrevo, identifyTrevoUser } = await importTrevo();
      initTrevo();
      expect(() => identifyTrevoUser("42")).not.toThrow();
    });
  });

  describe("getTrevoVariant", () => {
    it('returns "control" before init', async () => {
      const { getTrevoVariant } = await importTrevo();
      expect(getTrevoVariant("checkout-cta-test")).toBe("control");
      expect(mockSdk.getVariant).not.toHaveBeenCalled();
    });

    it("returns the SDK variant after init", async () => {
      mockSdk.getVariant.mockReturnValueOnce("variant-a");
      const { initTrevo, getTrevoVariant } = await importTrevo();
      initTrevo();
      expect(getTrevoVariant("checkout-cta-test")).toBe("variant-a");
      expect(mockSdk.getVariant).toHaveBeenCalledWith("checkout-cta-test");
    });

    it('returns "control" when the SDK throws', async () => {
      mockSdk.getVariant.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      const { initTrevo, getTrevoVariant } = await importTrevo();
      initTrevo();
      expect(getTrevoVariant("checkout-cta-test")).toBe("control");
    });
  });

  describe("trackTrevoEvent", () => {
    it("no-ops before init", async () => {
      const { trackTrevoEvent } = await importTrevo();
      trackTrevoEvent("purchase_completed");
      expect(mockSdk.track).not.toHaveBeenCalled();
    });

    it("forwards event name and properties after init", async () => {
      const { initTrevo, trackTrevoEvent } = await importTrevo();
      initTrevo();
      trackTrevoEvent("purchase_completed", { value: 49.99, plan: "pro" });
      expect(mockSdk.track).toHaveBeenCalledWith("purchase_completed", { value: 49.99, plan: "pro" });
    });

    it("swallows and logs SDK errors", async () => {
      mockSdk.track.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      const { initTrevo, trackTrevoEvent } = await importTrevo();
      initTrevo();
      expect(() => trackTrevoEvent("purchase_completed")).not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `TZ=UTC yarn vitest run apps/web/modules/trevo/lib/trevo.test.ts`
Expected: FAIL — cannot resolve `./trevo`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/modules/trevo/lib/trevo.ts`:

```typescript
import TrevoSDK from "@trevosdk/browser";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[trevo]"] });

export const TREVO_DEFAULT_VARIANT = "control";

let initialized = false;
let identifiedUserId: string | null = null;

export function initTrevo(): void {
  if (initialized) return;
  const apiKey = process.env.NEXT_PUBLIC_TREVO_SDK_KEY;
  if (!apiKey) return;
  try {
    TrevoSDK.init({ apiKey });
    initialized = true;
  } catch (error) {
    log.error("Failed to initialize Trevo SDK", { error });
  }
}

export function identifyTrevoUser(userId: string): void {
  if (!initialized || identifiedUserId === userId) return;
  try {
    TrevoSDK.identify(userId);
    identifiedUserId = userId;
  } catch (error) {
    log.error("Failed to identify Trevo user", { error });
  }
}

export function getTrevoVariant(experimentKey: string): string {
  if (!initialized) return TREVO_DEFAULT_VARIANT;
  try {
    return TrevoSDK.getVariant(experimentKey);
  } catch (error) {
    log.error("Failed to get Trevo variant", { experimentKey, error });
    return TREVO_DEFAULT_VARIANT;
  }
}

export function trackTrevoEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  try {
    TrevoSDK.track(eventName, properties);
  } catch (error) {
    log.error("Failed to track Trevo event", { eventName, error });
  }
}
```

Note: no `typeof window` guard is needed — `initTrevo()` is only invoked from a client-side `useEffect` (Task 3), and the module must stay testable in any Vitest environment.

- [ ] **Step 4: Run tests to verify they pass**

Run: `TZ=UTC yarn vitest run apps/web/modules/trevo/lib/trevo.test.ts`
Expected: PASS — 14 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/modules/trevo/lib/trevo.ts apps/web/modules/trevo/lib/trevo.test.ts
git commit -m "feat: add Trevo SDK wrapper with init/identify/variant/track guards"
```

---

### Task 3: TrevoProvider component (TDD)

**Files:**
- Create: `apps/web/modules/trevo/components/TrevoProvider.test.tsx`
- Create: `apps/web/modules/trevo/components/TrevoProvider.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/modules/trevo/components/TrevoProvider.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSession = vi.hoisted(() => vi.fn());
const mockInitTrevo = vi.hoisted(() => vi.fn());
const mockIdentifyTrevoUser = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ useSession: mockUseSession }));
vi.mock("../lib/trevo", () => ({
  initTrevo: mockInitTrevo,
  identifyTrevoUser: mockIdentifyTrevoUser,
}));

import { TrevoProvider } from "./TrevoProvider";

describe("TrevoProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders its children", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    const { getByText } = render(
      <TrevoProvider>
        <span>child</span>
      </TrevoProvider>
    );
    expect(getByText("child")).toBeTruthy();
  });

  it("initializes Trevo on mount", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(
      <TrevoProvider>
        <span>child</span>
      </TrevoProvider>
    );
    expect(mockInitTrevo).toHaveBeenCalledTimes(1);
  });

  it("does not identify without a session", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(
      <TrevoProvider>
        <span>child</span>
      </TrevoProvider>
    );
    expect(mockIdentifyTrevoUser).not.toHaveBeenCalled();
  });

  it("identifies the user once a session with a user id exists", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 42 } },
      status: "authenticated",
    });
    render(
      <TrevoProvider>
        <span>child</span>
      </TrevoProvider>
    );
    expect(mockIdentifyTrevoUser).toHaveBeenCalledWith("42");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `TZ=UTC yarn vitest run apps/web/modules/trevo/components/TrevoProvider.test.tsx`
Expected: FAIL — cannot resolve `./TrevoProvider`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/modules/trevo/components/TrevoProvider.tsx`:

```tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { identifyTrevoUser, initTrevo } from "../lib/trevo";

export function TrevoProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    initTrevo();
  }, []);

  useEffect(() => {
    if (userId) identifyTrevoUser(String(userId));
  }, [userId]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `TZ=UTC yarn vitest run apps/web/modules/trevo/components/TrevoProvider.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/modules/trevo/components/TrevoProvider.tsx apps/web/modules/trevo/components/TrevoProvider.test.tsx
git commit -m "feat: add TrevoProvider for SDK init and user identification"
```

---

### Task 4: Mount provider + final verification

**Files:**
- Modify: `apps/web/app/providers.tsx:26-36`

- [ ] **Step 1: Mount TrevoProvider inside SessionProvider**

In `apps/web/app/providers.tsx`, add the import (matching the existing `@calcom/web/modules/...` style used by `WebPushProvider`):

```tsx
import { TrevoProvider } from "@calcom/web/modules/trevo/components/TrevoProvider";
```

Then wrap directly inside `SessionProvider` (it needs session context and must cover all pages — no embed/booking-page exclusion):

```tsx
<SessionProvider>
  <TrevoProvider>
    <TrpcProvider>
      {/* ...existing tree unchanged... */}
    </TrpcProvider>
  </TrevoProvider>
</SessionProvider>
```

- [ ] **Step 2: Run all trevo tests**

Run: `TZ=UTC yarn vitest run apps/web/modules/trevo`
Expected: PASS — 18 tests across 2 files.

- [ ] **Step 3: Type check**

Run: `yarn type-check:ci --force`
Expected: no NEW errors vs. main (compare if any appear).

- [ ] **Step 4: Lint/format**

Run: `yarn biome check --write apps/web/modules/trevo apps/web/app/providers.tsx`
Expected: clean (or auto-fixed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/providers.tsx
git commit -m "feat: mount TrevoProvider in app providers"
```

- [ ] **Step 6: Push and open draft PR**

```bash
git push -u origin feat/trevo-sdk-setup
gh pr create --draft --title "feat: add Trevo experiments SDK setup" --body "..."
```

PR body should summarize: wrapper module, provider, env var, no-op-without-key behavior, and link the spec. End with the standard generated-with footer.
