---
title: Enforce kebab-case File Naming
impact: HIGH
tags: naming, files, biome, conventions
---

# Enforce kebab-case File Naming

**Impact: HIGH**

All new files must use `kebab-case` naming. This is enforced by Biome via the `useFilenamingConvention` rule at `warn` level in `biome.json`.

## Why kebab-case

1. **Case-insensitive filesystems**: macOS (HFS+) and Windows (NTFS) treat `MyFile.ts` and `myfile.ts` as the same file. PascalCase and camelCase cause silent conflicts — a developer renames a file locally, Git doesn't detect the change, and CI breaks on Linux. kebab-case eliminates this entire class of bugs.

2. **Consistent imports**: With kebab-case there's no ambiguity about how to import a file. No more guessing between `import from "./MyService"` vs `"./myService"` vs `"./my-service"`.

3. **URL-safe and shell-friendly**: kebab-case filenames don't require quoting in shell commands or URL encoding.

4. **Industry alignment**: Next.js routes, Biome defaults, and most modern tooling assume kebab-case.

## Current exceptions

Some legacy patterns still use PascalCase (e.g., `BookingRepository.ts`). These are grandfathered but should be migrated when touched. The Biome rule is set to `warn` (not `error`) to allow gradual migration.

## For AI agents

When creating new files, **always use kebab-case**:

```
booking-repository.ts       # not BookingRepository.ts
create-booking-service.ts   # not CreateBookingService.ts
user-dto.ts                 # not UserDTO.ts
booking.types.ts            # not Booking.types.ts (dot-suffixes like .types, .test, .spec are allowed)
```

When renaming existing files as part of a refactor, migrate them to kebab-case in the same PR.

## Biome configuration

The rule lives in `biome.json` under `overrides[*].linter.rules.style.useFilenamingConvention`:

```json
"useFilenamingConvention": {
  "level": "warn",
  "options": {
    "filenameCases": ["kebab-case"]
  }
}
```

Run `yarn biome check .` to see violations.
