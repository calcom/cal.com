import superjson from "superjson";

import { initTRPC } from "@trpc/server";

import type { createContextInner } from "./createContext";
import { errorFormatter } from "./errorFormatter";

export const tRPCContext = initTRPC.context<typeof createContextInner>().create({
  transformer: superjson,
  errorFormatter,
});

export const router = tRPCContext.router;
export const mergeRouters = tRPCContext.mergeRouters;
export const middleware = tRPCContext.middleware;
/**
 * Base procedure with error mapping middleware.
 * This converts ErrorWithCode thrown by feature layer code into TRPCError,
 * allowing features to remain transport-agnostic.
 */
export const procedure = tRPCContext.procedure;
export const createCallerFactory = tRPCContext.createCallerFactory;
