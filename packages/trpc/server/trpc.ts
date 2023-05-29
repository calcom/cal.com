import superjson from "superjson";

import { initTRPC } from "@trpc/server";
import { OpenApiMeta } from 'trpc-openapi';

import type { createContextInner } from "./createContext";
import type { UserFromSession } from "./middlewares/sessionMiddleware";

export const tRPCContext = initTRPC.meta<OpenApiMeta>().context<typeof createContextInner>().create({
  transformer: superjson,
});

export const router = tRPCContext.router;
export const mergeRouters = tRPCContext.mergeRouters;
export const middleware = tRPCContext.middleware;
export const procedure = tRPCContext.procedure;

export type TrpcSessionUser = UserFromSession;
