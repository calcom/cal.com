import { router } from "../trpc";
import { getViewerRouter } from "./viewer/_router";

export async function createAppRouter() {
  const viewerRouter = await getViewerRouter();
  return router({
    viewer: viewerRouter,
  });
}

export type AppRouter = Awaited<typeof createAppRouter>;
