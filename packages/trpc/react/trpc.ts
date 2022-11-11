import superjson from "superjson";

import { createTRPCReact } from "@trpc/react-query";

// ℹ️ Type-only import:
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export
import type { inferRouterInputs, inferRouterOutputs } from "../server";
import type { AppRouter } from "../server/routers/_app";

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createTRPCReact`.
 * @link https://trpc.io/docs/v10/react#2-create-trpc-hooks
 */
export const trpc = createTRPCReact<AppRouter>();

export const transformer = superjson;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
