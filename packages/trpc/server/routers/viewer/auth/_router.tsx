import { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";

import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZChangePasswordInputSchema } from "./changePassword.schema";
import { ZResendVerifyEmailSchema } from "./resendVerifyEmail.schema";
import { ZSendVerifyEmailCodeSchema } from "./sendVerifyEmailCode.schema";
import { ZVerifyPasswordInputSchema } from "./verifyPassword.schema";

type AuthRouterHandlerCache = {
  changePassword?: typeof import("./changePassword.handler").changePasswordHandler;
  verifyPassword?: typeof import("./verifyPassword.handler").verifyPasswordHandler;
  verifyCodeUnAuthenticated?: typeof import("./verifyCodeUnAuthenticated.handler").verifyCodeUnAuthenticatedHandler;
  resendVerifyEmail?: typeof import("./resendVerifyEmail.handler").resendVerifyEmail;
  sendVerifyEmailCode?: typeof import("./sendVerifyEmailCode.handler").sendVerifyEmailCodeHandler;
  resendVerifySecondaryEmail?: typeof import("./resendVerifyEmail.handler").resendVerifyEmail;
  createAccountPassword?: typeof import("./createAccountPassword.handler").createAccountPasswordHandler;
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

  verifyCodeUnAuthenticated: publicProcedure.input(ZVerifyCodeInputSchema).mutation(async ({ input }) => {
    if (!UNSTABLE_HANDLER_CACHE.verifyCodeUnAuthenticated) {
      UNSTABLE_HANDLER_CACHE.verifyCodeUnAuthenticated = await import(
        "./verifyCodeUnAuthenticated.handler"
      ).then((mod) => mod.verifyCodeUnAuthenticatedHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.verifyCodeUnAuthenticated) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.verifyCodeUnAuthenticated({
      input,
    });
  }),

  sendVerifyEmailCode: publicProcedure.input(ZSendVerifyEmailCodeSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.sendVerifyEmailCode) {
      UNSTABLE_HANDLER_CACHE.sendVerifyEmailCode = await import("./sendVerifyEmailCode.handler").then(
        (mod) => mod.sendVerifyEmailCodeHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.sendVerifyEmailCode) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.sendVerifyEmailCode({
      input,
      req: ctx.req,
    });
  }),

  resendVerifyEmail: authedProcedure.input(ZResendVerifyEmailSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.resendVerifyEmail) {
      UNSTABLE_HANDLER_CACHE.resendVerifyEmail = await import("./resendVerifyEmail.handler").then(
        (mod) => mod.resendVerifyEmail
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.resendVerifyEmail) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.resendVerifyEmail({
      input,
      ctx,
    });
  }),

  createAccountPassword: authedProcedure.mutation(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.createAccountPassword) {
      UNSTABLE_HANDLER_CACHE.createAccountPassword = await import("./createAccountPassword.handler").then(
        (mod) => mod.createAccountPasswordHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.createAccountPassword) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.createAccountPassword({
      ctx,
    });
  }),
});
