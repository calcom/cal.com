import { BookingStatus, MembershipRole, Prisma, SchedulingType, WorkflowMethods } from "@prisma/client";
import type { BookingReference, EventType, User, WebhookTriggerEvents } from "@prisma/client";
import type { TFunction } from "next-i18next";
import { z } from "zod";

import appStore from "@calcom/app-store";
import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { DailyLocationType } from "@calcom/app-store/locations";
import { cancelScheduledJobs } from "@calcom/app-store/zapier/lib/nodeScheduler";
import EventManager from "@calcom/core/EventManager";
import { CalendarEventBuilder } from "@calcom/core/builders/CalendarEvent/builder";
import { CalendarEventDirector } from "@calcom/core/builders/CalendarEvent/director";
import { deleteMeeting } from "@calcom/core/videoClient";
import dayjs from "@calcom/dayjs";
import { deleteScheduledEmailReminder } from "@calcom/ee/workflows/lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder } from "@calcom/ee/workflows/lib/reminders/smsReminderManager";
import { sendDeclinedEmails, sendLocationChangeEmails, sendRequestRescheduleEmail } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server";
import { bookingMinimalSelect } from "@calcom/prisma";
import { bookingConfirmPatchBodySchema } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent, Person } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import { authedProcedure, router } from "../../trpc";

export type PersonAttendeeCommonFields = Pick<
  User,
  "id" | "email" | "name" | "locale" | "timeZone" | "username"
>;

// Common data for all endpoints under webhook
const commonBookingSchema = z.object({
  bookingId: z.number(),
});

const bookingsProcedure = authedProcedure.input(commonBookingSchema).use(async ({ ctx, input, next }) => {
  // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
  const { bookingId } = input;
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

  if (!booking) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({ ctx: { booking } });
});

export const bookingsRouter = router({
  get: authedProcedure
    .input(
      z.object({
        filters: z.object({
          teamIds: z.number().array().optional(),
          userIds: z.number().array().optional(),
          status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]),
          eventTypeIds: z.number().array().optional(),
        }),
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
      })
    )
    .query(async ({ ctx, input }) => {
      // using offset actually because cursor pagination requires a unique column
      // for orderBy, but we don't use a unique column in our orderBy
      const take = input.limit ?? 10;
      const skip = input.cursor ?? 0;
      const { prisma, user } = ctx;
      const bookingListingByStatus = input.filters.status;
      const bookingListingFilters: Record<typeof bookingListingByStatus, Prisma.BookingWhereInput> = {
        upcoming: {
          endTime: { gte: new Date() },
          // These changes are needed to not show confirmed recurring events,
          // as rescheduling or cancel for recurring event bookings should be
          // handled separately for each occurrence
          OR: [
            {
              recurringEventId: { not: null },
              status: { equals: BookingStatus.ACCEPTED },
            },
            {
              recurringEventId: { equals: null },
              status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
            },
          ],
        },
        recurring: {
          endTime: { gte: new Date() },
          AND: [
            { NOT: { recurringEventId: { equals: null } } },
            { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] } },
          ],
        },
        past: {
          endTime: { lte: new Date() },
          AND: [
            { NOT: { status: { equals: BookingStatus.CANCELLED } } },
            { NOT: { status: { equals: BookingStatus.REJECTED } } },
          ],
        },
        cancelled: {
          OR: [
            { status: { equals: BookingStatus.CANCELLED } },
            { status: { equals: BookingStatus.REJECTED } },
          ],
        },
        unconfirmed: {
          endTime: { gte: new Date() },
          status: { equals: BookingStatus.PENDING },
        },
      };
      const bookingListingOrderby: Record<
        typeof bookingListingByStatus,
        Prisma.BookingOrderByWithAggregationInput
      > = {
        upcoming: { startTime: "asc" },
        recurring: { startTime: "asc" },
        past: { startTime: "desc" },
        cancelled: { startTime: "desc" },
        unconfirmed: { startTime: "asc" },
      };

      // TODO: Fix record typing
      const bookingWhereInputFilters: Record<string, Prisma.BookingWhereInput> = {
        teamIds: {
          AND: [
            {
              eventType: {
                team: {
                  id: {
                    in: input.filters?.teamIds,
                  },
                },
              },
            },
          ],
        },
        userIds: {
          AND: [
            {
              eventType: {
                users: {
                  some: {
                    id: {
                      in: input.filters?.userIds,
                    },
                  },
                },
              },
            },
          ],
        },
      };

      const filtersCombined: Prisma.BookingWhereInput[] =
        input.filters &&
        Object.keys(input.filters).map((key) => {
          return bookingWhereInputFilters[key];
        });

      const passedBookingsStatusFilter = bookingListingFilters[bookingListingByStatus];
      const orderBy = bookingListingOrderby[bookingListingByStatus];

      const [bookingsQuery, recurringInfoBasic, recurringInfoExtended] = await Promise.all([
        prisma.booking.findMany({
          where: {
            OR: [
              {
                userId: user.id,
              },
              {
                attendees: {
                  some: {
                    email: user.email,
                  },
                },
              },
              {
                eventType: {
                  team: {
                    members: {
                      some: {
                        userId: user.id,
                        role: {
                          in: ["ADMIN", "OWNER"],
                        },
                      },
                    },
                  },
                },
              },
              {
                seatsReferences: {
                  some: {
                    attendee: {
                      email: user.email,
                    },
                  },
                },
              },
            ],
            AND: [passedBookingsStatusFilter, ...(filtersCombined ?? [])],
          },
          select: {
            ...bookingMinimalSelect,
            uid: true,
            recurringEventId: true,
            location: true,
            eventType: {
              select: {
                slug: true,
                id: true,
                eventName: true,
                price: true,
                recurringEvent: true,
                team: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            status: true,
            paid: true,
            payment: {
              select: {
                paymentOption: true,
                amount: true,
                currency: true,
                success: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            rescheduled: true,
            references: true,
            isRecorded: true,
            seatsReferences: {
              where: {
                attendee: {
                  email: user.email,
                },
              },
              select: {
                referenceUid: true,
                attendee: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
          orderBy,
          take: take + 1,
          skip,
        }),
        prisma.booking.groupBy({
          by: ["recurringEventId"],
          _min: {
            startTime: true,
          },
          _count: {
            recurringEventId: true,
          },
          where: {
            recurringEventId: {
              not: { equals: null },
            },
            userId: user.id,
          },
        }),
        prisma.booking.groupBy({
          by: ["recurringEventId", "status", "startTime"],
          _min: {
            startTime: true,
          },
          where: {
            recurringEventId: {
              not: { equals: null },
            },
            userId: user.id,
          },
        }),
      ]);

      const recurringInfo = recurringInfoBasic.map(
        (
          info: (typeof recurringInfoBasic)[number]
        ): {
          recurringEventId: string | null;
          count: number;
          firstDate: Date | null;
          bookings: {
            [key: string]: Date[];
          };
        } => {
          const bookings = recurringInfoExtended.reduce(
            (prev, curr) => {
              if (curr.recurringEventId === info.recurringEventId) {
                prev[curr.status].push(curr.startTime);
              }
              return prev;
            },
            { ACCEPTED: [], CANCELLED: [], REJECTED: [], PENDING: [] } as {
              [key in BookingStatus]: Date[];
            }
          );
          return {
            recurringEventId: info.recurringEventId,
            count: info._count.recurringEventId,
            firstDate: info._min.startTime,
            bookings,
          };
        }
      );

      const bookings = bookingsQuery.map((booking) => {
        return {
          ...booking,
          eventType: {
            ...booking.eventType,
            recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
          },
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
        };
      });

      const bookingsFetched = bookings.length;
      let nextCursor: typeof skip | null = skip;
      if (bookingsFetched > take) {
        nextCursor += bookingsFetched;
      } else {
        nextCursor = null;
      }

      return {
        bookings,
        recurringInfo,
        nextCursor,
      };
    }),
  requestReschedule: authedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        rescheduleReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;
      const { bookingId, rescheduleReason: cancellationReason } = input;

      const bookingToReschedule = await prisma.booking.findFirstOrThrow({
        select: {
          id: true,
          uid: true,
          userId: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          eventTypeId: true,
          eventType: true,
          location: true,
          attendees: true,
          references: true,
          customInputs: true,
          dynamicEventSlugRef: true,
          dynamicGroupSlugRef: true,
          destinationCalendar: true,
          smsReminderNumber: true,
          scheduledJobs: true,
          workflowReminders: true,
          responses: true,
        },
        where: {
          uid: bookingId,
          NOT: {
            status: {
              in: [BookingStatus.CANCELLED, BookingStatus.REJECTED],
            },
          },
        },
      });

      if (!bookingToReschedule.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Booking to reschedule doesn't have an owner" });
      }

      if (!bookingToReschedule.eventType) {
        throw new TRPCError({ code: "FORBIDDEN", message: "EventType not found for current booking." });
      }

      const bookingBelongsToTeam = !!bookingToReschedule.eventType?.teamId;

      const userTeams = await prisma.user.findUniqueOrThrow({
        where: {
          id: user.id,
        },
        select: {
          teams: true,
        },
      });

      if (bookingBelongsToTeam && bookingToReschedule.eventType?.teamId) {
        const userTeamIds = userTeams.teams.map((item) => item.teamId);
        if (userTeamIds.indexOf(bookingToReschedule?.eventType?.teamId) === -1) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User isn't a member on the team" });
        }
      }
      if (!bookingBelongsToTeam && bookingToReschedule.userId !== user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User isn't owner of the current booking" });
      }

      if (bookingToReschedule) {
        let event: Partial<EventType> = {};
        if (bookingToReschedule.eventTypeId) {
          event = await prisma.eventType.findFirstOrThrow({
            select: {
              title: true,
              users: true,
              schedulingType: true,
              recurringEvent: true,
            },
            where: {
              id: bookingToReschedule.eventTypeId,
            },
          });
        }
        await prisma.booking.update({
          where: {
            id: bookingToReschedule.id,
          },
          data: {
            rescheduled: true,
            cancellationReason,
            status: BookingStatus.CANCELLED,
            updatedAt: dayjs().toISOString(),
          },
        });

        // delete scheduled jobs of previous booking
        cancelScheduledJobs(bookingToReschedule);

        //cancel workflow reminders of previous booking
        bookingToReschedule.workflowReminders.forEach((reminder) => {
          if (reminder.method === WorkflowMethods.EMAIL) {
            deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
          } else if (reminder.method === WorkflowMethods.SMS) {
            deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
          }
        });

        const [mainAttendee] = bookingToReschedule.attendees;
        // @NOTE: Should we assume attendees language?
        const tAttendees = await getTranslation(mainAttendee.locale ?? "en", "common");
        const usersToPeopleType = (
          users: PersonAttendeeCommonFields[],
          selectedLanguage: TFunction
        ): Person[] => {
          return users?.map((user) => {
            return {
              email: user.email || "",
              name: user.name || "",
              username: user?.username || "",
              language: { translate: selectedLanguage, locale: user.locale || "en" },
              timeZone: user?.timeZone,
            };
          });
        };

        const userTranslation = await getTranslation(user.locale ?? "en", "common");
        const [userAsPeopleType] = usersToPeopleType([user], userTranslation);

        const builder = new CalendarEventBuilder();
        builder.init({
          title: bookingToReschedule.title,
          type: event && event.title ? event.title : bookingToReschedule.title,
          startTime: bookingToReschedule.startTime.toISOString(),
          endTime: bookingToReschedule.endTime.toISOString(),
          attendees: usersToPeopleType(
            // username field doesn't exists on attendee but could be in the future
            bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
            tAttendees
          ),
          organizer: userAsPeopleType,
        });

        const director = new CalendarEventDirector();
        director.setBuilder(builder);
        director.setExistingBooking(bookingToReschedule);
        cancellationReason && director.setCancellationReason(cancellationReason);
        if (event) {
          await director.buildForRescheduleEmail();
        } else {
          await director.buildWithoutEventTypeForRescheduleEmail();
        }

        // Handling calendar and videos cancellation
        // This can set previous time as available, until virtual calendar is done
        const credentialsMap = new Map();
        user.credentials.forEach((credential) => {
          credentialsMap.set(credential.type, credential);
        });
        const bookingRefsFiltered: BookingReference[] = bookingToReschedule.references.filter((ref) =>
          credentialsMap.has(ref.type)
        );
        bookingRefsFiltered.forEach(async (bookingRef) => {
          if (bookingRef.uid) {
            if (bookingRef.type.endsWith("_calendar")) {
              const calendar = await getCalendar(credentialsMap.get(bookingRef.type));

              return calendar?.deleteEvent(
                bookingRef.uid,
                builder.calendarEvent,
                bookingRef.externalCalendarId
              );
            } else if (bookingRef.type.endsWith("_video")) {
              return deleteMeeting(credentialsMap.get(bookingRef.type), bookingRef.uid);
            }
          }
        });

        // Send emails
        await sendRequestRescheduleEmail(builder.calendarEvent, {
          rescheduleLink: builder.rescheduleLink,
        });

        const evt: CalendarEvent = {
          title: bookingToReschedule?.title,
          type: event && event.title ? event.title : bookingToReschedule.title,
          description: bookingToReschedule?.description || "",
          customInputs: isPrismaObjOrUndefined(bookingToReschedule.customInputs),
          ...getCalEventResponses({
            booking: bookingToReschedule,
            bookingFields: bookingToReschedule.eventType?.bookingFields ?? null,
          }),
          startTime: bookingToReschedule?.startTime ? dayjs(bookingToReschedule.startTime).format() : "",
          endTime: bookingToReschedule?.endTime ? dayjs(bookingToReschedule.endTime).format() : "",
          organizer: userAsPeopleType,
          attendees: usersToPeopleType(
            // username field doesn't exists on attendee but could be in the future
            bookingToReschedule.attendees as unknown as PersonAttendeeCommonFields[],
            tAttendees
          ),
          uid: bookingToReschedule?.uid,
          location: bookingToReschedule?.location,
          destinationCalendar:
            bookingToReschedule?.destinationCalendar || bookingToReschedule?.destinationCalendar,
          cancellationReason: `Please reschedule. ${cancellationReason}`, // TODO::Add i18-next for this
        };

        // Send webhook
        const eventTrigger: WebhookTriggerEvents = "BOOKING_CANCELLED";
        // Send Webhook call if hooked to BOOKING.CANCELLED
        const subscriberOptions = {
          userId: bookingToReschedule.userId,
          eventTypeId: (bookingToReschedule.eventTypeId as number) || 0,
          triggerEvent: eventTrigger,
        };
        const webhooks = await getWebhooks(subscriberOptions);
        const promises = webhooks.map((webhook) =>
          sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, {
            ...evt,
            smsReminderNumber: bookingToReschedule.smsReminderNumber || undefined,
          }).catch((e) => {
            console.error(
              `Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}`,
              e
            );
          })
        );
        await Promise.all(promises);
      }
    }),
  editLocation: bookingsProcedure
    .input(
      commonBookingSchema.extend({
        newLocation: z.string().transform((val) => val || DailyLocationType),
      })
    )

    .mutation(async ({ ctx, input }) => {
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
          seatsPerTimeSlot: booking.eventType?.seatsPerTimeSlot,
          seatsShowAttendees: booking.eventType?.seatsShowAttendees,
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
    }),
  confirm: bookingsProcedure.input(bookingConfirmPatchBodySchema).mutation(async ({ ctx, input }) => {
    const { user, prisma } = ctx;
    const { bookingId, recurringEventId, reason: rejectionReason, confirmed } = input;

    const tOrganizer = await getTranslation(user.locale ?? "en", "common");

    const booking = await prisma.booking.findUniqueOrThrow({
      where: {
        id: bookingId,
      },
      select: {
        title: true,
        description: true,
        customInputs: true,
        startTime: true,
        endTime: true,
        attendees: true,
        eventTypeId: true,
        responses: true,
        eventType: {
          select: {
            id: true,
            owner: true,
            teamId: true,
            recurringEvent: true,
            title: true,
            requiresConfirmation: true,
            currency: true,
            length: true,
            description: true,
            price: true,
            bookingFields: true,
            disableGuests: true,
            metadata: true,
            workflows: {
              include: {
                workflow: {
                  include: {
                    steps: true,
                  },
                },
              },
            },
            customInputs: true,
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

    // If booking requires payment and is not paid, we don't allow confirmation
    if (confirmed && booking.payment.length > 0 && !booking.paid) {
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.ACCEPTED,
        },
      });

      return { message: "Booking confirmed", status: BookingStatus.ACCEPTED };
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
      type: booking.eventType?.title || booking.title,
      title: booking.title,
      description: booking.description,
      // TODO: Remove the usage of `bookingFields` in computing responses. We can do that by storing `label` with the response. Also, this would allow us to correctly show the label for a field even after the Event Type has been deleted.
      ...getCalEventResponses({
        bookingFields: booking.eventType?.bookingFields ?? null,
        booking,
      }),
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
    if (recurringEventId) {
      if (
        !(await prisma.booking.findFirst({
          where: {
            recurringEventId,
            id: booking.id,
          },
        }))
      ) {
        // FIXME: It might be best to retrieve recurringEventId from the booking itself.
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Recurring event id doesn't belong to the booking",
        });
      }
    }
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
      await handleConfirmation({ user, evt, recurringEventId, prisma, bookingId, booking });
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
        // handle refunds
        if (!!booking.payment.length) {
          const successPayment = booking.payment.find((payment) => payment.success);
          if (!successPayment) {
            // Disable paymentLink for this booking
          } else {
            let eventTypeOwnerId;
            if (booking.eventType?.owner) {
              eventTypeOwnerId = booking.eventType.owner.id;
            } else if (booking.eventType?.teamId) {
              const teamOwner = await prisma.membership.findFirst({
                where: {
                  teamId: booking.eventType.teamId,
                  role: MembershipRole.OWNER,
                },
                select: {
                  userId: true,
                },
              });
              eventTypeOwnerId = teamOwner?.userId;
            }

            if (!eventTypeOwnerId) {
              throw new Error("Event Type owner not found for obtaining payment app credentials");
            }

            const paymentAppCredentials = await prisma.credential.findMany({
              where: {
                userId: eventTypeOwnerId,
                appId: successPayment.appId,
              },
              select: {
                key: true,
                appId: true,
                app: {
                  select: {
                    categories: true,
                    dirName: true,
                  },
                },
              },
            });

            const paymentAppCredential = paymentAppCredentials.find((credential) => {
              return credential.appId === successPayment.appId;
            });

            if (!paymentAppCredential) {
              throw new Error("Payment app credentials not found");
            }

            // Posible to refactor TODO:
            const paymentApp = await appStore[paymentAppCredential?.app?.dirName as keyof typeof appStore];
            if (!(paymentApp && "lib" in paymentApp && "PaymentService" in paymentApp.lib)) {
              console.warn(`payment App service of type ${paymentApp} is not implemented`);
              return null;
            }

            const PaymentService = paymentApp.lib.PaymentService;
            const paymentInstance = new PaymentService(paymentAppCredential);
            const paymentData = await paymentInstance.refund(successPayment.id);
            if (!paymentData.refunded) {
              throw new Error("Payment could not be refunded");
            }
          }
        }
        // end handle refunds.

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

    const message = "Booking " + confirmed ? "confirmed" : "rejected";
    const status = confirmed ? BookingStatus.ACCEPTED : BookingStatus.REJECTED;

    return { message, status };
  }),
  getBookingAttendees: authedProcedure
    .input(z.object({ seatReferenceUid: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bookingSeat = await ctx.prisma.bookingSeat.findUniqueOrThrow({
        where: {
          referenceUid: input.seatReferenceUid,
        },
        select: {
          booking: {
            select: {
              _count: {
                select: {
                  seatsReferences: true,
                },
              },
            },
          },
        },
      });

      if (!bookingSeat) {
        throw new Error("Booking not found");
      }
      return bookingSeat.booking._count.seatsReferences;
    }),
});
