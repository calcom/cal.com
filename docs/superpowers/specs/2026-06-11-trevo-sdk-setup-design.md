# Trevo SDK Setup — Design

**Date:** 2026-06-11
**Status:** Approved

## Goal

Integrate the Trevo experiments SDK (`@trevosdk/browser@0.1.14`) into the web app: initialize it with an API key on app load, identify the user once signed in, and expose `getVariant` / `track` for experiment assignment and conversion tracking.

## Decisions

- **Thin wrapper module**: components never import `@trevosdk/browser` directly. The vendor stays isolated behind `apps/web/modules/trevo/lib/trevo.ts` (per the technology-isolation rule).
- **Loads everywhere**: the SDK initializes on all pages, including public booking pages and embeds, so booker flows can be experimented on. `identify` fires only when a session exists.
- **No-op without a key**: if `NEXT_PUBLIC_TREVO_SDK_KEY` is unset (e.g., self-hosted instances), every wrapper function is a safe no-op and `getVariant` returns `"control"`.

## Components

### 1. Dependency

`@trevosdk/browser@0.1.14` added to `apps/web/package.json` dependencies.

### 2. Environment variable

`NEXT_PUBLIC_TREVO_SDK_KEY`:
- Added to `.env.example` (empty default, with a short comment)
- Added to `turbo.json` `globalEnv`

### 3. Wrapper — `apps/web/modules/trevo/lib/trevo.ts`

| Function | Behavior |
| --- | --- |
| `initTrevo()` | Guards on browser context + key presence; calls `TrevoSDK.init({ apiKey })`; idempotent across re-renders/navigations |
| `identifyTrevoUser(userId)` | Calls `TrevoSDK.identify(userId)`; no-ops if not initialized; idempotent per user id |
| `getTrevoVariant(experimentKey)` | Returns `TrevoSDK.getVariant(key)`; returns `"control"` if not initialized or on error |
| `trackTrevoEvent(eventName, properties?)` | Calls `TrevoSDK.track(...)`; no-ops if not initialized |

All SDK calls are wrapped in try/catch with `logger` — a third-party analytics vendor must never break the app.

### 4. Provider — `apps/web/modules/trevo/components/TrevoProvider.tsx`

`"use client"` component:
- `useEffect` on mount → `initTrevo()`
- `useSession()` → when `session.user.id` becomes available, `identifyTrevoUser(String(id))`
- Renders `children` unchanged

Mounted in `apps/web/app/providers.tsx` inside `SessionProvider` (needs session context), with no embed/booking-page exclusion.

### 5. Tests — `apps/web/modules/trevo/lib/trevo.test.ts`

Vitest unit tests mocking `@trevosdk/browser`:
- `initTrevo` no-ops without key; inits once with key; idempotent on repeat calls
- `identifyTrevoUser` no-ops before init; passes user id after init
- `getTrevoVariant` returns `"control"` before init and on SDK throw; passes through variant after init
- `trackTrevoEvent` no-ops before init; forwards name + properties after init

## Error handling

- Missing env key → silent no-op (expected configuration for self-hosted)
- SDK throws during init/identify/track → caught and logged at `error` level
- SDK throws during `getVariant` → caught, logged, `"control"` returned

## Out of scope

- Server-side variant evaluation / SSR flicker handling
- React hook sugar (`useTrevoVariant`) — call sites can use the wrapper directly; a hook can be added when a consumer needs reactivity
- Replacing existing ad-hoc PostHog usage
