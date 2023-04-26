import { router, authedProcedure } from "../../../trpc";
import { ZChangePasswordInputSchema } from "./changePassword.schema";
import { ZVerifyPasswordInputSchema } from "./verifyPassword.schema";

type AuthRouterHandlerCache = {
  changePassword?: typeof import("./changePassword.handler").changePasswordHandler;
  verifyPassword?: typeof import("./verifyPassword.handler").verifyPasswordHandler;
};

const UNSTABLE_HANDLER_CACHE: AuthRouterHandlerCache = {};

export const authRouter = router({
  changePassword: authedProcedure.input(ZChangePasswordInputSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.changePassword) {
      UNSTABLE_HANDLER_CACHE.changePassword = await import("./changePassword.handler").then(
        (mod) => mod.changePasswordHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.changePassword) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.changePassword({
      ctx,
      input,
    });
  }),

  verifyPassword: authedProcedure.input(ZVerifyPasswordInputSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.verifyPassword) {
      UNSTABLE_HANDLER_CACHE.verifyPassword = await import("./verifyPassword.handler").then(
        (mod) => mod.verifyPasswordHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.verifyPassword) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.verifyPassword({
      ctx,
      input,
    });
  }),
});
