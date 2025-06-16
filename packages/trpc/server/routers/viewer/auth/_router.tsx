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

export const authRouter = router({
  changePassword: authedProcedure.input(ZChangePasswordInputSchema).mutation(async ({ input, ctx }) => {
    const { changePasswordHandler } = await import("./changePassword.handler");

    return changePasswordHandler({
      ctx,
      input,
    });
  }),

  verifyPassword: authedProcedure.input(ZVerifyPasswordInputSchema).mutation(async ({ input, ctx }) => {
    const { verifyPasswordHandler } = await import("./verifyPassword.handler");

    return verifyPasswordHandler({
      ctx,
      input,
    });
  }),

  verifyCodeUnAuthenticated: publicProcedure.input(ZVerifyCodeInputSchema).mutation(async ({ input }) => {
    const { verifyCodeUnAuthenticatedHandler } = await import("./verifyCodeUnAuthenticated.handler");

    return verifyCodeUnAuthenticatedHandler({
      input,
    });
  }),

  sendVerifyEmailCode: publicProcedure.input(ZSendVerifyEmailCodeSchema).mutation(async ({ input, ctx }) => {
    const { sendVerifyEmailCodeHandler } = await import("./sendVerifyEmailCode.handler");

    return sendVerifyEmailCodeHandler({
      input,
      req: ctx.req,
    });
  }),

  resendVerifyEmail: authedProcedure.input(ZResendVerifyEmailSchema).mutation(async ({ input, ctx }) => {
    const { resendVerifyEmail } = await import("./resendVerifyEmail.handler");

    return resendVerifyEmail({
      input,
      ctx,
    });
  }),

  createAccountPassword: authedProcedure.mutation(async ({ ctx }) => {
    const { createAccountPasswordHandler } = await import("./createAccountPassword.handler");

    return createAccountPasswordHandler({
      ctx,
    });
  }),
});
