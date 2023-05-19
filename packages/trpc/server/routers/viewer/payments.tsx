import { z } from "zod";

import appStore from "@calcom/app-store";
import dayjs from "@calcom/dayjs";
import { sendNoShowFeeChargedEmail } from "@calcom/emails";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { getTranslation } from "@calcom/lib/server/i18n";
import sendPayload from "@calcom/lib/server/webhooks/sendPayload";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../procedures/authedProcedure";
import { router } from "../../trpc";

export const paymentsRouter = router({
  chargeCard: authedProcedure
    .input(
      z.object({
        bookingId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;

      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
        },
        include: {
          payment: true,
          user: true,
          attendees: true,
          eventType: true,
        },
      });

      const payment = booking.payment[0];

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (payment.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `The no show fee for ${booking.id} has already been charged.`,
        });
      }

      const tOrganizer = await getTranslation(booking.user?.locale ?? "en", "common");

      const attendeesListPromises = [];

      for (const attendee of booking.attendees) {
        const attendeeObject = {
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: {
            translate: await getTranslation(attendee.locale ?? "en", "common"),
            locale: attendee.locale ?? "en",
          },
        };

        attendeesListPromises.push(attendeeObject);
      }

      const attendeesList = await Promise.all(attendeesListPromises);

      const evt: CalendarEvent = {
        type: (booking?.eventType?.title as string) || booking?.title,
        title: booking.title,
        startTime: dayjs(booking.startTime).format(),
        endTime: dayjs(booking.endTime).format(),
        organizer: {
          email: booking.user?.email || "",
          name: booking.user?.name || "Nameless",
          timeZone: booking.user?.timeZone || "",
          language: { translate: tOrganizer, locale: booking.user?.locale ?? "en" },
        },
        attendees: attendeesList,
        paymentInfo: {
          amount: payment.amount,
          currency: payment.currency,
          paymentOption: payment.paymentOption,
        },
      };

      const paymentCredential = await prisma.credential.findFirst({
        where: {
          userId: ctx.user.id,
          appId: payment.appId,
        },
        include: {
          app: true,
        },
      });

      if (!paymentCredential?.app) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment credential" });
      }

      const paymentApp = await appStore[paymentCredential?.app?.dirName as keyof typeof appStore];

      if (!("lib" in paymentApp && "PaymentService" in paymentApp.lib)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment service not found" });
      }

      const PaymentService = paymentApp.lib.PaymentService;
      const paymentInstance = new PaymentService(paymentCredential);

      try {
        const paymentData = await paymentInstance.chargeCard(payment);

        if (!paymentData) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Could not generate payment data` });
        }

        const subscriberOptions = {
          userId: ctx.user.id || 0,
          eventTypeId: booking.eventTypeId || 0,
          triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
        };

        const subscribers = await getWebhooks(subscriberOptions);

        await Promise.all(
          subscribers.map(async (subscriber) => {
            sendPayload(subscriber.secret, WebhookTriggerEvents.BOOKING_PAID, {
              ...evt,
              bookingId: booking.id,
              paymentId: payment.id,
              paymentData,
              eventTypeId: subscriberOptions.eventTypeId,
            });
          })
        );

        await sendNoShowFeeChargedEmail(attendeesListPromises[0], evt);

        return paymentData;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error processing payment with error ${err}`,
        });
      }
    }),
});
