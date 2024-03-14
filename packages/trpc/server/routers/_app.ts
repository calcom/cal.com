/**
 * This file contains the root router of your tRPC-backend
 */
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
});

type AppRouterType = typeof appRouter;
/** @see https://github.com/trpc/trpc/issues/2568#issuecomment-1264683718 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppRouter extends AppRouterType {}
