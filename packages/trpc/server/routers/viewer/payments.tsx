import { z } from "zod";

import appStore from "@calcom/app-store";
import dayjs from "@calcom/dayjs";
import { sendNoShowFeeChargedEmail } from "@calcom/emails";
import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PaymentApp } from "@calcom/types/PaymentService";

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

      const booking = await prisma.booking.findUniqueOrThrow({
        where: {
          id: input.bookingId,
        },
        include: {
          payment: true,
          user: {
            select: {
              email: true,
              locale: true,
              name: true,
              timeZone: true,
            },
          },
          attendees: true,
          eventType: true,
        },
      });

      const payment = booking.payment[0];

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
        type: booking?.eventType?.slug as string,
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
        customReplyToEmail: booking.eventType?.customReplyToEmail,
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

      const paymentApp = (await appStore[
        paymentCredential?.app?.dirName as keyof typeof appStore
      ]?.()) as PaymentApp | null;

      if (!(paymentApp && paymentApp.lib && "lib" in paymentApp && "PaymentService" in paymentApp.lib)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment service not found" });
      }

      const PaymentService = paymentApp.lib.PaymentService;
      const paymentInstance = new PaymentService(paymentCredential);

      try {
        const paymentData = await paymentInstance.chargeCard(payment);

        if (!paymentData) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Could not generate payment data` });
        }

        const userId = ctx.user.id || 0;
        const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId });
        const eventTypeId = booking.eventTypeId || 0;
        const webhooks = await WebhookService.init({
          userId,
          eventTypeId,
          triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
          orgId,
        });
        await webhooks.sendPayload({
          ...evt,
          bookingId: booking.id,
          paymentId: payment.id,
          paymentData,
          eventTypeId,
        });

        await sendNoShowFeeChargedEmail(
          attendeesListPromises[0],
          evt,
          booking?.eventType?.metadata as EventTypeMetadata
        );

        return paymentData;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error processing payment with error ${err}`,
        });
      }
    }),
});
