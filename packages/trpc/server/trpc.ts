import { initTRPC } from "@trpc/server";

import { transformer } from "../utils/transformer";
import type { createContextInner } from "./createContext";
import { errorFormatter } from "./errorFormatter";

export const tRPCContext = initTRPC.context<typeof createContextInner>().create({
  transformer,
  errorFormatter,
});

export const router = tRPCContext.router;
export const mergeRouters = tRPCContext.mergeRouters;
export const middleware = tRPCContext.middleware;
export const procedure = tRPCContext.procedure;
export const createCallerFactory = tRPCContext.createCallerFactory;
