import { z } from "zod";

import appStore from "@calcom/app-store";

import { router, authedProcedure } from "../../trpc";

export const paymentsRouter = router({
  chargeCard: authedProcedure
    .input(
      z.object({
        bookingId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("🚀 ~ file: payments.tsx:13 ~ .mutation ~ input:", input);
      const { prisma } = ctx;

      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
        },
        include: {
          payment: true,
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      const paymentCredential = await prisma.credential.findFirst({
        where: {
          userId: ctx.user.id,
          appId: booking.payment[0].appId,
        },
        include: {
          app: true,
        },
      });
      console.log("🚀 ~ file: payments.tsx:29 ~ .mutation ~ paymentCredential:", paymentCredential);
      console.log(
        "🚀 ~ file: payments.tsx:36 ~ .mutation ~ paymentCredential?.app?.dirName:",
        paymentCredential?.app?.dirName
      );

      const paymentApp = appStore[paymentCredential?.app?.dirName as keyof typeof appStore];
      const PaymentService = paymentApp.lib.PaymentService;
      const paymentInstance = new PaymentService(paymentCredential);

      const paymentData = await paymentInstance.chargeCard(booking.payment[0], booking.id);

      if (!paymentData) {
        throw new Error("Payment failed");
      }

      return paymentData;
    }),
});
