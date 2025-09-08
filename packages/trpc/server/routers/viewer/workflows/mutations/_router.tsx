import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZActivateEventTypeInputSchema } from "./activateEventType.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZSendVerificationCodeInputSchema } from "./sendVerificationCode.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZVerifyEmailCodeInputSchema } from "./verifyEmailCode.schema";
import { ZVerifyPhoneNumberInputSchema } from "./verifyPhoneNumber.schema";
import { ZWorkflowOrderInputSchema } from "./workflowOrder.schema";

export const workflowsMutationsRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");
    return createHandler({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./delete.handler");
    return deleteHandler({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");
    return updateHandler({
      ctx,
      input,
    });
  }),

  activateEventType: authedProcedure.input(ZActivateEventTypeInputSchema).mutation(async ({ ctx, input }) => {
    const { activateEventTypeHandler } = await import("./activateEventType.handler");
    return activateEventTypeHandler({
      ctx,
      input,
    });
  }),

  sendVerificationCode: authedProcedure
    .input(ZSendVerificationCodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { sendVerificationCodeHandler } = await import("./sendVerificationCode.handler");
      return sendVerificationCodeHandler({
        ctx,
        input,
      });
    }),

  verifyPhoneNumber: authedProcedure.input(ZVerifyPhoneNumberInputSchema).mutation(async ({ ctx, input }) => {
    const { verifyPhoneNumberHandler } = await import("./verifyPhoneNumber.handler");
    return verifyPhoneNumberHandler({
      ctx,
      input,
    });
  }),

  verifyEmailCode: authedProcedure.input(ZVerifyEmailCodeInputSchema).mutation(async ({ ctx, input }) => {
    const { verifyEmailCodeHandler } = await import("./verifyEmailCode.handler");
    return verifyEmailCodeHandler({
      ctx,
      input,
    });
  }),

  workflowOrder: authedProcedure.input(ZWorkflowOrderInputSchema).mutation(async ({ ctx, input }) => {
    const { workflowOrderHandler } = await import("./workflowOrder.handler");
    return workflowOrderHandler({ ctx, input });
  }),
});
