/**
 * This file contains the root router of your tRPC-backend
 */
import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";

import { router } from "../trpc";
import { viewerRouter } from "./viewer/_router";

/**
 * Create your application's root router
 * If you want to use SSG, you need export this
 * @link https://trpc.io/docs/ssg
 * @link https://trpc.io/docs/router
 */
export const appRouter = router({
  viewer: viewerRouter,
  testing: router({
    greeting: publicProcedure.query(() => ({
      hello: "hello tRPC v10!",
    })),
  }),
});

export type AppRouter = typeof appRouter;
