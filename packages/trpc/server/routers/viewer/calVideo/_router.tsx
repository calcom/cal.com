import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZGetCalVideoRecordingsInputSchema } from "./getCalVideoRecordings.schema";
import { ZGetDownloadLinkOfCalVideoRecordingsInputSchema } from "./getDownloadLinkOfCalVideoRecordings.schema";

type AppsRouterHandlerCache = {
  getCalVideoRecordings?: typeof import("./getCalVideoRecordings.handler").getCalVideoRecordingsHandler;
  getDownloadLinkOfCalVideoRecordings?: typeof import("./getDownloadLinkOfCalVideoRecordings.handler").getDownloadLinkOfCalVideoRecordingsHandler;
};

const UNSTABLE_HANDLER_CACHE: AppsRouterHandlerCache = {};

export const calVideoRouter = router({
  getCalVideoRecordings: authedProcedure
    .input(ZGetCalVideoRecordingsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getCalVideoRecordings) {
        UNSTABLE_HANDLER_CACHE.getCalVideoRecordings = (
          await import("./getCalVideoRecordings.handler")
        ).getCalVideoRecordingsHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getCalVideoRecordings) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getCalVideoRecordings({ ctx, input });
    }),

  getDownloadLinkOfCalVideoRecordings: authedProcedure
    .input(ZGetDownloadLinkOfCalVideoRecordingsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getDownloadLinkOfCalVideoRecordings) {
        UNSTABLE_HANDLER_CACHE.getDownloadLinkOfCalVideoRecordings = (
          await import("./getDownloadLinkOfCalVideoRecordings.handler")
        ).getDownloadLinkOfCalVideoRecordingsHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getDownloadLinkOfCalVideoRecordings) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getDownloadLinkOfCalVideoRecordings({ ctx, input });
    }),
});
