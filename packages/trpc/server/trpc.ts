import superjson from "superjson";

import { initTRPC } from "@trpc/server";

import type { createContextInner } from "./createContext";
import type { UserFromSession } from "./middlewares/sessionMiddleware";

export const tRPCContext = initTRPC.context<typeof createContextInner>().create({
  transformer: superjson,
});

export const router = tRPCContext.router;
export const mergeRouters = tRPCContext.mergeRouters;
export const middleware = tRPCContext.middleware;
export const procedure = tRPCContext.procedure;

export type TrpcSessionUser = UserFromSession;

// eslint-disable-next-line @typescript-eslint/ban-types
const UNSTABLE_HANDLER_CACHE: Record<string, Function> = {};

/**
 * This function will import the module defined in importer just once and then cache the default export of that module.
 *
 * It gives you the default export of the module.
 *
 * **Note: It is your job to ensure that the name provided is unique across all routes.**
 * @example
 * ```ts
const handler = await importHandler("myUniqueNameSpace", () => import("./getUser.handler"));
return handler({ ctx, input });
 * ```
 */
export const importHandler = async <
  T extends {
    // eslint-disable-next-line @typescript-eslint/ban-types
    default: Function;
  }
>(
  /**
   * The name of the handler in cache. It has to be unique across all routes
   */
  name: string,
  importer: () => Promise<T>
) => {
  const nameInCache = name as keyof typeof UNSTABLE_HANDLER_CACHE;

  if (!UNSTABLE_HANDLER_CACHE[nameInCache]) {
    const importedModule = await importer();
    UNSTABLE_HANDLER_CACHE[nameInCache] = importedModule.default;
    return importedModule.default as T["default"];
  }

  return UNSTABLE_HANDLER_CACHE[nameInCache] as unknown as T["default"];
};
