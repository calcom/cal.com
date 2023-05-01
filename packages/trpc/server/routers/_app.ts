/**
 * This file contains the root router of your tRPC-backend
 */
import { router } from "../trpc";
import { viewerRouter } from "./routers/viewer/_router";

import type { Endpoint } from "../../react";

/**
 * Create your application's root router
 * If you want to use SSG, you need export this
 * @link https://trpc.io/docs/ssg
 * @link https://trpc.io/docs/router
 */
export const appRouter = router({
  viewer: viewerRouter,
} satisfies Record<Endpoint, any>);

export type AppRouter = typeof appRouter;
