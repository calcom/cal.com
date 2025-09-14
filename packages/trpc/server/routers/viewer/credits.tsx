import { z } from "zod";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";

import { TRPCError } from "@trpc/server";

import { router, authedProcedure } from "../../trpc";

export const creditsRouter = router({
  getAutoRechargeSettings: authedProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!IS_SMS_CREDITS_ENABLED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "SMS credits are not enabled",
        });
      }

      const { teamId } = input;
      const userId = teamId ? undefined : ctx.user.id;

      const creditService = new CreditService();
      const settings = await creditService.getAutoRechargeSettings({
        teamId,
        userId,
      });

      return { settings };
    }),

  updateAutoRechargeSettings: authedProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
        enabled: z.boolean(),
        threshold: z.number().min(10).optional(),
        amount: z.number().min(50).optional(),
        stripeCustomerId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!IS_SMS_CREDITS_ENABLED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "SMS credits are not enabled",
        });
      }

      const { teamId, enabled, threshold, amount, stripeCustomerId } = input;
      const userId = teamId ? undefined : ctx.user.id;

      const creditService = new CreditService();
      await creditService.updateAutoRechargeSettings({
        teamId,
        userId,
        enabled,
        threshold,
        amount,
        stripeCustomerId,
      });

      return { success: true };
    }),

  // ...existing code...
});
