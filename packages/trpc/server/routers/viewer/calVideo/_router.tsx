import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZDeleteCalVideoRecordingInputSchema } from "./deleteCalVideoRecording.schema";
import { ZGetCalVideoRecordingsInputSchema } from "./getCalVideoRecordings.schema";
import { ZGetDownloadLinkOfCalVideoRecordingsInputSchema } from "./getDownloadLinkOfCalVideoRecordings.schema";
import { ZGetMeetingInformationInputSchema } from "./getMeetingInformation.schema";

type CalVideoRouterHandlerCache = {
  deleteCalVideoRecording?: typeof import("./deleteCalVideoRecording.handler").deleteCalVideoRecordingHandler;
  getCalVideoRecordings?: typeof import("./getCalVideoRecordings.handler").getCalVideoRecordingsHandler;
  getDownloadLinkOfCalVideoRecordings?: typeof import("./getDownloadLinkOfCalVideoRecordings.handler").getDownloadLinkOfCalVideoRecordingsHandler;
  getMeetingInformation?: typeof import("./getMeetingInformation.handler").getMeetingInformationHandler;
};

export const calVideoRouter = router({
  deleteCalVideoRecording: authedProcedure
    .input(ZDeleteCalVideoRecordingInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { deleteCalVideoRecordingHandler } = await import("./deleteCalVideoRecording.handler");

      return deleteCalVideoRecordingHandler({ ctx, input });
    }),

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

  getMeetingInformation: authedProcedure
    .input(ZGetMeetingInformationInputSchema)
    .query(async ({ ctx, input }) => {
      const { getMeetingInformationHandler } = await import("./getMeetingInformation.handler");

      return getMeetingInformationHandler({ ctx, input });
    }),
});
