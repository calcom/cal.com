/**
 * This file contains the root router of your tRPC-backend
 */
import { router } from "../trpc";
import { getViewerRouter } from "./viewer/_router";

export { AppRouter } from "./viewer/_router.types";

/**
 * Create your application's root router
 * If you want to use SSG, you need export this
 * @link https://trpc.io/docs/ssg
 * @link https://trpc.io/docs/router
 */
export async function createAppRouter() {
  const viewerRouter = await getViewerRouter();
  return router({
    viewer: viewerRouter,
  });
}
