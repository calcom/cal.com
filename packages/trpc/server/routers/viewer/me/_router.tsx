import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZDeleteMeInputSchema } from "./deleteMe.schema";
import { get } from "./procedures/get";
import { ZUpdateProfileInputSchema } from "./updateProfile.schema";

export const meRouter = router({
  bookingUnconfirmedCount: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./bookingUnconfirmedCount.handler")).bookingUnconfirmedCountHandler;
    return handler({ ctx });
  }),
  deleteMe: authedProcedure.input(ZDeleteMeInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./deleteMe.handler")).deleteMeHandler;
    return handler({ ctx, input });
  }),
  deleteMeWithoutPassword: authedProcedure.mutation(async ({ ctx }) => {
    const handler = (await import("./deleteMeWithoutPassword.handler")).deleteMeWithoutPasswordHandler;
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
    const handler = (await import("./platformMe.handler")).platformMeHandler;
    return handler({ ctx });
  }),
  shouldVerifyEmail: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./shouldVerifyEmail.handler")).shouldVerifyEmailHandler;
    return handler({ ctx });
  }),
  updateProfile: authedProcedure.input(ZUpdateProfileInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./updateProfile.handler")).updateProfileHandler;
    return handler({ ctx, input });
  }),
});
