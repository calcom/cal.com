---
name: ab-experiment
description: Add, modify, or remove A/B tests (experiments). Use when asked to create a new A/B test, split test, experiment, feature experiment, variant test, or wire up / clean up an existing one.
---

# A/B Experiment Skill

Also known as: A/B test, split test, experiment, feature experiment, variant test.

This skill guides you through the full lifecycle of A/B experiments in the Cal.com codebase. The codebase uses the term "experiment" throughout (config, hooks, admin UI), but the concept is standard A/B testing.

Before proceeding, read the detailed guide:

```
packages/features/experiments/GUIDE.md
```

## Quick Reference

### Key files

| File | Purpose |
|------|---------|
| `packages/features/experiments/config.ts` | Register experiment slugs, variants, and target audience |
| `packages/features/experiments/GUIDE.md` | Full step-by-step guide |
| `apps/web/modules/experiments/hooks/useExperiment.ts` | `useExperiment()` hook for components |
| `apps/web/modules/experiments/provider.tsx` | `ExperimentProvider` context (wraps pages) |
| `apps/web/modules/experiments/getCachedExperimentData.ts` | Server-side helper for pages |
| `packages/i18n/locales/en/common.json` | Translation keys for variant text |

### Adding a new experiment

1. **Register** in `config.ts` — add slug, variants array, and target (`"logged-in"` or `"anonymous"`)
2. **Seed migration** — create a Prisma migration inserting `Experiment` and `ExperimentVariant` rows with labels
3. **Wrap page** with `<ExperimentProvider>` using `getCachedExperimentData()` in the server component
4. **Use hook** — `useExperiment("slug")` in the component, call `trackExposure()` when visible, `trackOutcome()` on success
5. **Translations** — add any new UI text to `common.json`

### `useExperiment` API

```tsx
const { variant, isControl, trackExposure, trackOutcome } = useExperiment("your-slug");
// variant: string | null (null = control)
// isControl: boolean
// trackExposure: () => void — call when variant becomes visible
// trackOutcome: () => void — call on desired user action
```

**Exposure is NOT auto-tracked by default.** Call `trackExposure()` manually when the variant is actually visible (e.g. when a dialog opens). For always-visible components, pass `{ trackExposure: true }`.

### Removing / concluding an experiment

1. Remove the `useExperiment()` call and variant branching from the component
2. Remove the entry from `config.ts`
3. Remove the `<ExperimentProvider>` wrapper if no other experiments use that page
4. Admin sets the winner in `/settings/admin/experiments`

### Example: existing experiment

See `apps/web/modules/billing/components/UpgradePlanDialog.tsx` for a complete example of:
- Wiring `useExperiment("upgrade-dialog-try-cta")`
- Tracking exposure on dialog open via `useEffect`
- Tracking outcome on CTA click
- Conditional button text based on variant
