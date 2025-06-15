import { z } from "zod";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { createPhoneNumber } from "@calcom/features/ee/cal-ai-phone/retellAIService";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../../trpc";

export const phoneNumberRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const numbers = await prisma.calAiPhoneNumber.findMany({
      where: {
        userId: ctx.user.id,
      },
    });

    return numbers;
  }),

  buy: protectedProcedure
    .input(z.object({ areaCode: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const creditService = new CreditService();
      const hasCredits = await creditService.hasAvailableCredits({ userId: ctx.user.id });
      if (!hasCredits) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have enough credits." });
      }

      const chargeResult = await creditService.chargeCredits({
        userId: ctx.user.id,
        // TODO: Change this number later
        credits: 50,
      });

      if (!chargeResult) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to charge credits." });
      }

      const retellPhoneNumber = await createPhoneNumber(input.areaCode);

      const newNumber = await prisma.calAiPhoneNumber.create({
        data: {
          userId: ctx.user.id,
          phoneNumber: retellPhoneNumber.phone_number,
          provider: "retell",
        },
      });

      return newNumber;
    }),
});
