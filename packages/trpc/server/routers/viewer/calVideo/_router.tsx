import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZGetCalVideoRecordingsInputSchema } from "./getCalVideoRecordings.schema";
import { ZGetDownloadLinkOfCalVideoRecordingsInputSchema } from "./getDownloadLinkOfCalVideoRecordings.schema";

export const calVideoRouter = router({
  getCalVideoRecordings: authedProcedure
    .input(ZGetCalVideoRecordingsInputSchema)
    .query(async ({ ctx, input }) => {
      const { getCalVideoRecordingsHandler } = await import("./getCalVideoRecordings.handler");

      return getCalVideoRecordingsHandler({ ctx, input });
    }),

  getDownloadLinkOfCalVideoRecordings: authedProcedure
    .input(ZGetDownloadLinkOfCalVideoRecordingsInputSchema)
    .query(async ({ ctx, input }) => {
      const { getDownloadLinkOfCalVideoRecordingsHandler } = await import(
        "./getDownloadLinkOfCalVideoRecordings.handler"
      );

      return getDownloadLinkOfCalVideoRecordingsHandler({ ctx, input });
    }),
});
