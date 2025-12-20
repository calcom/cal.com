/**
 * Type bridge for AppRouter - imports from generated types instead of server source.
 *
 * This file exists to:
 * 1. Avoid forcing TypeScript to traverse the entire server router tree when typechecking client code
 * 2. Provide a stable import location that's easy to lint against
 * 3. Make it easy to adjust if the generated path changes
 *
 * IMPORTANT: The @calcom/trpc#build task must run before any package that imports from here.
 * This is already enforced in turbo.json (type-check depends on @calcom/trpc#build).
 */
export type { AppRouter } from "./server/routers/_app";
