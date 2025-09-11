import { z } from "zod";

import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import dayjs from "@calcom/dayjs";
import { workflowSelect } from "@calcom/ee/workflows/lib/getAllWorkflows";
import { sendNoShowFeeChargedEmail } from "@calcom/emails";
import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import { WebhookTriggerEvents, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
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
          eventType: {
            select: {
              schedulingType: true,
              owner: {
                select: {
                  hideBranding: true,
                },
              },
              hosts: {
                select: {
                  user: {
                    select: {
                      email: true,
                      destinationCalendar: {
                        select: {
                          primaryEmail: true,
                        },
                      },
                    },
                  },
                },
              },
              customReplyToEmail: true,
              slug: true,
              metadata: true,
              workflows: {
                select: {
                  workflow: {
                    select: workflowSelect,
                  },
                },
              },
            },
          },
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

      const orgId = await getOrgIdFromMemberOrTeamId({ memberId: ctx.user.id });
      const workflows = await getAllWorkflowsFromEventType(booking.eventType, ctx.user.id);
      const bookerUrl = await getBookerBaseUrl(orgId ?? null);

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
        bookerUrl,
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

      const key = paymentCredential?.app?.dirName;
      const paymentAppImportFn = PaymentServiceMap[key as keyof typeof PaymentServiceMap];
      if (!paymentAppImportFn) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment app not implemented" });
      }

      const paymentApp = await paymentAppImportFn;
      if (!(paymentApp && "PaymentService" in paymentApp && paymentApp?.PaymentService)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment service not found" });
      }

      const PaymentService = paymentApp.PaymentService;
      const paymentInstance = new PaymentService(paymentCredential);

      try {
        const paymentData = await paymentInstance.chargeCard(payment, booking.id);

        if (!paymentData) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Could not generate payment data` });
        }

        const userId = ctx.user.id || 0;
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

        if (workflows.length > 0) {
          try {
            await WorkflowService.scheduleWorkflowsFilteredByTriggerEvent({
              workflows,
              smsReminderNumber: booking.smsReminderNumber,
              calendarEvent: {
                ...evt,
                bookerUrl,
                eventType: {
                  ...booking.eventType,
                  slug: booking.eventType?.slug || "",
                },
              },
              hideBranding: !!booking.eventType?.owner?.hideBranding,
              triggers: [WorkflowTriggerEvents.BOOKING_PAID],
            });
          } catch (error) {
            // Silently fail
            console.error(
              "Error while scheduling workflow reminders for BOOKING_PAID:",
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        return paymentData;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error processing payment with error ${err}`,
        });
      }
    }),
});
