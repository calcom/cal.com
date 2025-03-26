import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { bookingUnconfirmedCountHandler } from "./bookingUnconfirmedCount.handler";
import { deleteMeHandler } from "./deleteMe.handler";
import { ZDeleteMeInputSchema } from "./deleteMe.schema";
import { deleteMeWithoutPasswordHandler } from "./deleteMeWithoutPassword.handler";
import { getUserTopBannersHandler } from "./getUserTopBanners.handler";
import { myStatsHandler } from "./myStats.handler";
import { platformMeHandler } from "./platformMe.handler";
import { get } from "./procedures/get";
import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

export const meRouter = router({
  bookingUnconfirmedCount: authedProcedure.query(async ({ ctx }) => {
    return bookingUnconfirmedCountHandler({ ctx });
  }),
  deleteMe: authedProcedure.input(ZDeleteMeInputSchema).mutation(async ({ ctx, input }) => {
    return deleteMeHandler({ ctx, input });
  }),
  deleteMeWithoutPassword: authedProcedure.mutation(async ({ ctx }) => {
    return deleteMeWithoutPasswordHandler({ ctx });
  }),
  get,
  getUserTopBanners: authedProcedure.query(async ({ ctx }) => {
    return getUserTopBannersHandler({ ctx });
  }),
  myStats: authedProcedure.query(async ({ ctx }) => {
    return myStatsHandler({ ctx });
  }),
  platformMe: authedProcedure.query(async ({ ctx }) => {
    return platformMeHandler({ ctx });
  }),
  shouldVerifyEmail: authedProcedure.query(async ({ ctx }) => {
    return shouldVerifyEmailHandler({ ctx });
  }),
});
