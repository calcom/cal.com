import { mergeRouters, router } from "../../trpc";
import { publicViewerRouter } from "../publicViewer/_router";

export const viewerRouter = mergeRouters(
  router({
    public: publicViewerRouter,
  })
);
