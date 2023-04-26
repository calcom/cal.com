import { publicViewerRouter } from "../publicViewer/_router";
import { mergeRouters, router } from "../../trpc";

export const viewerRouter = mergeRouters(
  router({
    public: publicViewerRouter,
  })
);
