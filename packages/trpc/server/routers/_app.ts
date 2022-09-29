/**
 * This file contains the root router of your tRPC-backend
 */
import { createRouter } from "../createRouter";
import { publicProcedure, t } from "../trpc";
import { publicRouter } from "./public";
import { viewerRouter } from "./viewer";

/**
 * Create your application's root router
 * If you want to use SSG, you need export this
 * @link https://trpc.io/docs/ssg
 * @link https://trpc.io/docs/router
 * @deprecated
 */
export const legacyRouter = createRouter()
  /**
   * Optionally do custom error (type safe!) formatting
   * @link https://trpc.io/docs/error-formatting
   */
  // .formatError(({ shape, error }) => { })
  .merge("viewer.", viewerRouter)
  .interop();

const v10Router = t.router({
  hello: publicProcedure.query(() => "hello"),
  public: publicRouter,
});

export const appRouter = t.mergeRouters(legacyRouter, v10Router);

export type AppRouter = typeof appRouter;
