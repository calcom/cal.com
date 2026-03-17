import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZUpdateAbuseScoringConfigInputSchema } from "./config.schema";
import { ZListLockedUsersInputSchema, ZUnlockUserInputSchema } from "./lockedUsers.schema";

export const abuseScoringRouter = router({
  lockedUsers: router({
    list: authedAdminProcedure.input(ZListLockedUsersInputSchema).query(async (opts) => {
      const { listLockedUsersHandler: handler } = await import("./lockedUsers.handler");
      return handler(opts);
    }),
    unlock: authedAdminProcedure.input(ZUnlockUserInputSchema).mutation(async (opts) => {
      const { unlockUserHandler: handler } = await import("./lockedUsers.handler");
      return handler(opts);
    }),
  }),
  config: router({
    get: authedAdminProcedure.query(async () => {
      const { getConfigHandler: handler } = await import("./config.handler");
      return handler();
    }),
    update: authedAdminProcedure.input(ZUpdateAbuseScoringConfigInputSchema).mutation(async (opts) => {
      const { updateConfigHandler: handler } = await import("./config.handler");
      return handler(opts);
    }),
  }),
});
