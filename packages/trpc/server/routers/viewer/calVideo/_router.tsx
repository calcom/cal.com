import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZGetCalVideoRecordingsInputSchema } from "./getCalVideoRecordings.schema";
import { ZGetDownloadLinkOfCalVideoRecordingsInputSchema } from "./getDownloadLinkOfCalVideoRecordings.schema";
import { ZGetMeetingInformationInputSchema } from "./getMeetingInformation.schema";
import { ZSetCustomDailyCredentialsInputSchema } from "./setCustomDailyCredentials.schema";

type CalVideoRouterHandlerCache = {
  getCalVideoRecordings?: typeof import("./getCalVideoRecordings.handler").getCalVideoRecordingsHandler;
  getDownloadLinkOfCalVideoRecordings?: typeof import("./getDownloadLinkOfCalVideoRecordings.handler").getDownloadLinkOfCalVideoRecordingsHandler;
  getMeetingInformation?: typeof import("./getMeetingInformation.handler").getMeetingInformationHandler;
  setCustomDailyCredentials?: typeof import("./setCustomDailyCredentials.handler").setCustomDailyCredentialsHandler;
  getCustomDailyCredentials?: typeof import("./getCustomDailyCredentials.handler").getCustomDailyCredentialsHandler;
  removeCustomDailyCredentials?: typeof import("./removeCustomDailyCredentials.handler").removeCustomDailyCredentialsHandler;
};

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

  getMeetingInformation: authedProcedure
    .input(ZGetMeetingInformationInputSchema)
    .query(async ({ ctx, input }) => {
      const { getMeetingInformationHandler } = await import("./getMeetingInformation.handler");

      return getMeetingInformationHandler({ ctx, input });
    }),

  setCustomDailyCredentials: authedProcedure
    .input(ZSetCustomDailyCredentialsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { setCustomDailyCredentialsHandler } = await import("./setCustomDailyCredentials.handler");

      return setCustomDailyCredentialsHandler({ ctx, input });
    }),

  getCustomDailyCredentials: authedProcedure.query(async ({ ctx }) => {
    const { getCustomDailyCredentialsHandler } = await import("./getCustomDailyCredentials.handler");

    return getCustomDailyCredentialsHandler({ ctx });
  }),

  removeCustomDailyCredentials: authedProcedure.mutation(async ({ ctx }) => {
    const { removeCustomDailyCredentialsHandler } = await import("./removeCustomDailyCredentials.handler");

    return removeCustomDailyCredentialsHandler({ ctx });
  }),
});
