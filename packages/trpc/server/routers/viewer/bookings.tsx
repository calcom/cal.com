import {
  BookingStatus,
  Prisma,
  SchedulingType,
  WebhookTriggerEvents,
  Workflow,
  WorkflowsOnEventTypes,
  WorkflowStep,
} from "@prisma/client";
import { z } from "zod";

import { DailyLocationType } from "@calcom/app-store/locations";
import { refund } from "@calcom/app-store/stripepayment/lib/server";
import { scheduleTrigger } from "@calcom/app-store/zapier/lib/nodeScheduler";
import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendDeclinedEmails, sendLocationChangeEmails, sendScheduledEmails } from "@calcom/emails";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server";
import getSubscribers from "@calcom/lib/webhooks/subscriptions";
import { bookingConfirmPatchBodySchema } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

// Common data for all endpoints under webhook
const commonBookingSchema = z.object({
  bookingId: z.number(),
});

const log = logger.getChildLogger({ prefix: ["[api] book:user"] });

export const bookingsRouter = createProtectedRouter()
  .middleware(async ({ ctx, rawInput, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    if (!rawInput) return next({ ctx: { ...ctx, booking: null } });
    const webhookIdAndEventTypeId = commonBookingSchema.safeParse(rawInput);
    if (!webhookIdAndEventTypeId.success) throw new TRPCError({ code: "PARSE_ERROR" });

    const { bookingId } = webhookIdAndEventTypeId.data;
    const booking = await ctx.prisma.booking.findFirst({
      where: {
        id: bookingId,
        AND: [
          {
            OR: [
              /* If user is organizer */
              { userId: ctx.user.id },
              /* Or part of a collective booking */
              {
                eventType: {
                  schedulingType: SchedulingType.COLLECTIVE,
                  users: {
                    some: {
                      id: ctx.user.id,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      include: {
        attendees: true,
        eventType: true,
        destinationCalendar: true,
        references: true,
        user: {
          include: {
            destinationCalendar: true,
            credentials: true,
          },
        },
      },
    });
    return next({ ctx: { ...ctx, booking } });
  })
  .middleware(async ({ ctx, next }) => {
    // So TS doesn't compain in the previous middleware.
    // This means the user doesn't have access to this booking
    if (!ctx.booking) throw new TRPCError({ code: "UNAUTHORIZED" });
    // Booking here is non-nullable anymore
    return next({ ctx: { ...ctx, booking: ctx.booking } });
  })
  .mutation("editLocation", {
    input: commonBookingSchema.extend({
      newLocation: z.string().transform((val) => val || DailyLocationType),
    }),
    async resolve({ ctx, input }) {
      const { bookingId, newLocation: location } = input;
      const { booking } = ctx;

      try {
        const organizer = await ctx.prisma.user.findFirstOrThrow({
          where: {
            id: booking.userId || 0,
          },
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
          },
        });

        const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

        const attendeesListPromises = booking.attendees.map(async (attendee) => {
          return {
            name: attendee.name,
            email: attendee.email,
            timeZone: attendee.timeZone,
            language: {
              translate: await getTranslation(attendee.locale ?? "en", "common"),
              locale: attendee.locale ?? "en",
            },
          };
        });

        const attendeesList = await Promise.all(attendeesListPromises);

        const evt: CalendarEvent = {
          title: booking.title || "",
          type: (booking.eventType?.title as string) || booking?.title || "",
          description: booking.description || "",
          startTime: booking.startTime ? dayjs(booking.startTime).format() : "",
          endTime: booking.endTime ? dayjs(booking.endTime).format() : "",
          organizer: {
            email: organizer.email,
            name: organizer.name ?? "Nameless",
            timeZone: organizer.timeZone,
            language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
          },
          attendees: attendeesList,
          uid: booking.uid,
          recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
          location,
          destinationCalendar: booking?.destinationCalendar || booking?.user?.destinationCalendar,
        };

        const eventManager = new EventManager(ctx.user);

        const updatedResult = await eventManager.updateLocation(evt, booking);
        const results = updatedResult.results;
        if (results.length > 0 && results.every((res) => !res.success)) {
          const error = {
            errorCode: "BookingUpdateLocationFailed",
            message: "Updating location failed",
          };
          logger.error(`Booking ${ctx.user.username} failed`, error, results);
        } else {
          await ctx.prisma.booking.update({
            where: {
              id: bookingId,
            },
            data: {
              location,
              references: {
                create: updatedResult.referencesToCreate,
              },
            },
          });

          const metadata: AdditionalInformation = {};
          if (results.length) {
            metadata.hangoutLink = results[0].updatedEvent?.hangoutLink;
            metadata.conferenceData = results[0].updatedEvent?.conferenceData;
            metadata.entryPoints = results[0].updatedEvent?.entryPoints;
          }
          try {
            await sendLocationChangeEmails({ ...evt, additionalInformation: metadata });
          } catch (error) {
            console.log("Error sending LocationChangeEmails");
          }
        }
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return { message: "Location updated" };
    },
  })
  .mutation("confirm", {
    input: bookingConfirmPatchBodySchema,
    async resolve({ ctx, input }) {
      const { user, prisma } = ctx;
      const { bookingId, recurringEventId, reason: rejectionReason, confirmed } = input;

      const tOrganizer = await getTranslation(user.locale ?? "en", "common");

      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
        },
        rejectOnNotFound() {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
        },
        // should trpc handle this error  ?
        select: {
          title: true,
          description: true,
          customInputs: true,
          startTime: true,
          endTime: true,
          attendees: true,
          eventTypeId: true,
          eventType: {
            select: {
              id: true,
              recurringEvent: true,
              requiresConfirmation: true,
              workflows: {
                include: {
                  workflow: {
                    include: {
                      steps: true,
                    },
                  },
                },
              },
            },
          },
          location: true,
          userId: true,
          id: true,
          uid: true,
          payment: true,
          destinationCalendar: true,
          paid: true,
          recurringEventId: true,
          status: true,
          smsReminderNumber: true,
          scheduledJobs: true,
        },
      });
      const authorized = async () => {
        // if the organizer
        if (booking.userId === user.id) {
          return true;
        }
        const eventType = await prisma.eventType.findUnique({
          where: {
            id: booking.eventTypeId || undefined,
          },
          select: {
            id: true,
            schedulingType: true,
            users: true,
          },
        });
        if (
          eventType?.schedulingType === SchedulingType.COLLECTIVE &&
          eventType.users.find((user) => user.id === user.id)
        ) {
          return true;
        }
        return false;
      };

      if (!(await authorized())) throw new TRPCError({ code: "UNAUTHORIZED", message: "UNAUTHORIZED" });

      const isConfirmed = booking.status === BookingStatus.ACCEPTED;
      if (isConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Booking already confirmed" });

      /** When a booking that requires payment its being confirmed but doesn't have any payment,
       * we shouldn’t save it on DestinationCalendars
       */
      if (booking.payment.length > 0 && !booking.paid) {
        await prisma.booking.update({
          where: {
            id: bookingId,
          },
          data: {
            status: BookingStatus.ACCEPTED,
          },
        });

        return { message: "Booking confirmed" };
      }
      const attendeesListPromises = booking.attendees.map(async (attendee) => {
        return {
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: {
            translate: await getTranslation(attendee.locale ?? "en", "common"),
            locale: attendee.locale ?? "en",
          },
        };
      });

      const attendeesList = await Promise.all(attendeesListPromises);

      const evt: CalendarEvent = {
        type: booking.title,
        title: booking.title,
        description: booking.description,
        customInputs: isPrismaObjOrUndefined(booking.customInputs),
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        organizer: {
          email: user.email,
          name: user.name || "Unnamed",
          timeZone: user.timeZone,
          language: { translate: tOrganizer, locale: user.locale ?? "en" },
        },
        attendees: attendeesList,
        location: booking.location ?? "",
        uid: booking.uid,
        destinationCalendar: booking?.destinationCalendar || user.destinationCalendar,
        requiresConfirmation: booking?.eventType?.requiresConfirmation ?? false,
        eventTypeId: booking.eventType?.id,
      };

      const recurringEvent = parseRecurringEvent(booking.eventType?.recurringEvent);
      if (recurringEventId && recurringEvent) {
        const groupedRecurringBookings = await prisma.booking.groupBy({
          where: {
            recurringEventId: booking.recurringEventId,
          },
          by: [Prisma.BookingScalarFieldEnum.recurringEventId],
          _count: true,
        });
        // Overriding the recurring event configuration count to be the actual number of events booked for
        // the recurring event (equal or less than recurring event configuration count)
        recurringEvent.count = groupedRecurringBookings[0]._count;
        // count changed, parsing again to get the new value in
        evt.recurringEvent = parseRecurringEvent(recurringEvent);
      }

      if (confirmed) {
        const eventManager = new EventManager(user);
        const scheduleResult = await eventManager.create(evt);

        const results = scheduleResult.results;

        if (results.length > 0 && results.every((res) => !res.success)) {
          const error = {
            errorCode: "BookingCreatingMeetingFailed",
            message: "Booking failed",
          };

          log.error(`Booking ${user.username} failed`, error, results);
        } else {
          const metadata: AdditionalInformation = {};

          if (results.length) {
            // TODO: Handle created event metadata more elegantly
            metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
            metadata.conferenceData = results[0].createdEvent?.conferenceData;
            metadata.entryPoints = results[0].createdEvent?.entryPoints;
          }
          try {
            await sendScheduledEmails({ ...evt, additionalInformation: metadata });
          } catch (error) {
            log.error(error);
          }
        }
        let updatedBookings: {
          scheduledJobs: string[];
          id: number;
          startTime: Date;
          endTime: Date;
          uid: string;
          smsReminderNumber: string | null;
          eventType: {
            workflows: (WorkflowsOnEventTypes & {
              workflow: Workflow & {
                steps: WorkflowStep[];
              };
            })[];
          } | null;
        }[] = [];

        if (recurringEventId) {
          // The booking to confirm is a recurring event and comes from /booking/recurring, proceeding to mark all related
          // bookings as confirmed. Prisma updateMany does not support relations, so doing this in two steps for now.
          const unconfirmedRecurringBookings = await prisma.booking.findMany({
            where: {
              recurringEventId,
              status: BookingStatus.PENDING,
            },
          });

          const updateBookingsPromise = unconfirmedRecurringBookings.map((recurringBooking) => {
            return prisma.booking.update({
              where: {
                id: recurringBooking.id,
              },
              data: {
                status: BookingStatus.ACCEPTED,
                references: {
                  create: scheduleResult.referencesToCreate,
                },
              },
              select: {
                eventType: {
                  select: {
                    workflows: {
                      include: {
                        workflow: {
                          include: {
                            steps: true,
                          },
                        },
                      },
                    },
                  },
                },
                uid: true,
                startTime: true,
                endTime: true,
                smsReminderNumber: true,
                id: true,
                scheduledJobs: true,
              },
            });
          });
          const updatedBookingsResult = await Promise.all(updateBookingsPromise);
          updatedBookings = updatedBookings.concat(updatedBookingsResult);
        } else {
          // @NOTE: be careful with this as if any error occurs before this booking doesn't get confirmed
          // Should perform update on booking (confirm) -> then trigger the rest handlers
          const updatedBooking = await prisma.booking.update({
            where: {
              id: bookingId,
            },
            data: {
              status: BookingStatus.ACCEPTED,
              references: {
                create: scheduleResult.referencesToCreate,
              },
            },
            select: {
              eventType: {
                select: {
                  workflows: {
                    include: {
                      workflow: {
                        include: {
                          steps: true,
                        },
                      },
                    },
                  },
                },
              },
              uid: true,
              startTime: true,
              endTime: true,
              smsReminderNumber: true,
              id: true,
              scheduledJobs: true,
            },
          });
          updatedBookings.push(updatedBooking);
        }

        //Workflows - set reminders for confirmed events
        for (const updatedBooking of updatedBookings) {
          if (updatedBooking.eventType?.workflows) {
            const evtOfBooking = evt;
            evtOfBooking.startTime = updatedBooking.startTime.toISOString();
            evtOfBooking.endTime = updatedBooking.endTime.toISOString();
            evtOfBooking.uid = updatedBooking.uid;

            await scheduleWorkflowReminders(
              updatedBooking.eventType.workflows,
              updatedBooking.smsReminderNumber,
              evtOfBooking,
              false,
              false
            );
          }
        }

        // schedule job for zapier trigger 'when meeting ends'
        const subscriberOptionsMeetingEnded = {
          userId: booking.userId || 0,
          eventTypeId: booking.eventTypeId || 0,
          triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
        };

        const subscribersMeetingEnded = await getSubscribers(subscriberOptionsMeetingEnded);

        subscribersMeetingEnded.forEach((subscriber) => {
          updatedBookings.forEach((booking) => {
            scheduleTrigger(booking, subscriber.subscriberUrl, subscriber);
          });
        });
      } else {
        evt.rejectionReason = rejectionReason;
        if (recurringEventId) {
          // The booking to reject is a recurring event and comes from /booking/upcoming, proceeding to mark all related
          // bookings as rejected.
          await prisma.booking.updateMany({
            where: {
              recurringEventId,
              status: BookingStatus.PENDING,
            },
            data: {
              status: BookingStatus.REJECTED,
              rejectionReason,
            },
          });
        } else {
          await refund(booking, evt); // No payment integration for recurring events for v1
          await prisma.booking.update({
            where: {
              id: bookingId,
            },
            data: {
              status: BookingStatus.REJECTED,
              rejectionReason,
            },
          });
        }

        await sendDeclinedEmails(evt);
      }
      return { message: "Booking " + confirmed ? "confirmed" : "rejected" };
    },
  });
