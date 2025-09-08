import authedProcedure, { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZSaveKeysInputSchema } from "./saveKeys.schema";
import { ZSetDefaultConferencingAppSchema } from "./setDefaultConferencingApp.schema";
import { ZToggleInputSchema } from "./toggle.schema";
import { ZUpdateAppCredentialsInputSchema } from "./updateAppCredentials.schema";
import { ZUpdateUserDefaultConferencingAppInputSchema } from "./updateUserDefaultConferencingApp.schema";

export const appsMutationsRouter = router({
  toggle: authedAdminProcedure.input(ZToggleInputSchema).mutation(async ({ ctx, input }) => {
    const { toggleHandler } = await import("./toggle.handler");
    return toggleHandler({
      ctx,
      input,
    });
  }),

  saveKeys: authedAdminProcedure.input(ZSaveKeysInputSchema).mutation(async ({ ctx, input }) => {
    const { saveKeysHandler } = await import("./saveKeys.handler");
    return saveKeysHandler({
      ctx,
      input,
    });
  }),

  setDefaultConferencingApp: authedProcedure
    .input(ZSetDefaultConferencingAppSchema)
    .mutation(async ({ ctx, input }) => {
      const { setDefaultConferencingAppHandler } = await import("./setDefaultConferencingApp.handler");
      return setDefaultConferencingAppHandler({
        ctx,
        input,
      });
    }),

  updateAppCredentials: authedProcedure
    .input(ZUpdateAppCredentialsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateAppCredentialsHandler } = await import("./updateAppCredentials.handler");
      return updateAppCredentialsHandler({
        ctx,
        input,
      });
    }),

  updateUserDefaultConferencingApp: authedProcedure
    .input(ZUpdateUserDefaultConferencingAppInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateUserDefaultConferencingAppHandler } = await import(
        "./updateUserDefaultConferencingApp.handler"
      );
      return updateUserDefaultConferencingAppHandler({ ctx, input });
    }),
});
