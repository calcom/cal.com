import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { get } from "../procedures/get";

export const meQueriesRouter = router({
  bookingUnconfirmedCount: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./bookingUnconfirmedCount.handler")).bookingUnconfirmedCountHandler;
    return handler({ ctx });
  }),
  get,
  getUserTopBanners: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./getUserTopBanners.handler")).getUserTopBannersHandler;
    return handler({ ctx });
  }),
  myStats: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./myStats.handler")).myStatsHandler;
    return handler({ ctx });
  }),
  platformMe: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("../platformMe.handler")).platformMeHandler;
    return handler({ ctx });
  }),
  shouldVerifyEmail: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./shouldVerifyEmail.handler")).shouldVerifyEmailHandler;
    return handler({ ctx });
  }),
});
