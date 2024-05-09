import z from "zod";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { DailyLocationType } from "@calcom/core/location";
import { sendCancelledEmails } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { cancelScheduledJobs } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { deletePayment } from "@calcom/lib/payment/deletePayment";
import { getTranslation } from "@calcom/lib/server/i18n";
import { bookingMinimalSelect, prisma } from "@calcom/prisma";
import { AppCategories, BookingStatus } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TDeleteCredentialInputSchema } from "./deleteCredential.schema";

type DeleteCredentialOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteCredentialInputSchema;
};

export const deleteCredentialHandler = async ({ ctx, input }: DeleteCredentialOptions) => {
  const { user } = ctx;
  const { id, teamId } = input;

  const credential = await prisma.credential.findFirst({
    where: {
      id: id,
      ...(teamId ? { teamId } : { userId: ctx.user.id }),
    },
    select: {
      ...credentialForCalendarServiceSelect,
      app: {
        select: {
          slug: true,
          categories: true,
          dirName: true,
        },
      },
    },
  });

  if (!credential) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      OR: [
        {
          ...(teamId ? { teamId } : { userId: ctx.user.id }),
        },
        // for managed events
        {
          parent: {
            teamId,
          },
        },
      ],
    },
    select: {
      id: true,
      locations: true,
      destinationCalendar: {
        include: {
          credential: true,
        },
      },
      price: true,
      currency: true,
      metadata: true,
    },
  });

  // TODO: Improve this uninstallation cleanup per event by keeping a relation of EventType to App which has the data.
  for (const eventType of eventTypes) {
    if (eventType.locations) {
      // If it's a video, replace the location with Cal video
      if (
        credential.app?.categories.includes(AppCategories.video) ||
        credential.app?.categories.includes(AppCategories.conferencing)
      ) {
        // Find the user's event types

        // Look for integration name from app slug
        const integrationQuery =
          credential.app?.slug === "msteams" ? "office365_video" : credential.app?.slug.split("-")[0];

        // Check if the event type uses the deleted integration

        // To avoid type errors, need to stringify and parse JSON to use array methods
        const locationsSchema = z.array(z.object({ type: z.string() }));
        const locations = locationsSchema.parse(eventType.locations);

        const updatedLocations = locations.map((location: { type: string }) => {
          if (location.type.includes(integrationQuery)) {
            return { type: DailyLocationType };
          }
          return location;
        });

        await prisma.eventType.update({
          where: {
            id: eventType.id,
          },
          data: {
            locations: updatedLocations,
          },
        });
      }
    }

    // If it's a calendar, remove the destination calendar from the event type
    if (
      credential.app?.categories.includes(AppCategories.calendar) &&
      eventType.destinationCalendar?.credential?.appId === credential.appId
    ) {
      const destinationCalendar = await prisma.destinationCalendar.findFirst({
        where: {
          id: eventType.destinationCalendar?.id,
        },
      });

      if (destinationCalendar) {
        await prisma.destinationCalendar.delete({
          where: {
            id: destinationCalendar.id,
          },
        });
      }
    }

    // If it's a payment, hide the event type and set the price to 0. Also cancel all pending bookings
    if (credential.app?.categories.includes(AppCategories.payment)) {
      const metadata = EventTypeMetaDataSchema.parse(eventType.metadata);
      const appSlug = credential.app?.slug;
      if (appSlug) {
        await prisma.$transaction(async () => {
          await prisma.eventType.update({
            where: {
              id: eventType.id,
            },
            data: {
              hidden: true,
              metadata: {
                ...metadata,
                apps: {
                  ...metadata?.apps,
                  [appSlug]: undefined,
                },
              },
            },
          });

          // Assuming that all bookings under this eventType need to be paid
          const unpaidBookings = await prisma.booking.findMany({
            where: {
              userId: ctx.user.id,
              eventTypeId: eventType.id,
              status: "PENDING",
              paid: false,
              payment: {
                every: {
                  success: false,
                },
              },
            },
            select: {
              ...bookingMinimalSelect,
              recurringEventId: true,
              userId: true,
              responses: true,
              user: {
                select: {
                  id: true,
                  credentials: true,
                  email: true,
                  timeZone: true,
                  name: true,
                  destinationCalendar: true,
                  locale: true,
                },
              },
              location: true,
              references: {
                select: {
                  uid: true,
                  type: true,
                  externalCalendarId: true,
                },
              },
              payment: true,
              paid: true,
              eventType: {
                select: {
                  recurringEvent: true,
                  title: true,
                  bookingFields: true,
                  seatsPerTimeSlot: true,
                  seatsShowAttendees: true,
                  eventName: true,
                },
              },
              uid: true,
              eventTypeId: true,
              destinationCalendar: true,
            },
          });

          for (const booking of unpaidBookings) {
            await prisma.booking.update({
              where: {
                id: booking.id,
              },
              data: {
                status: BookingStatus.CANCELLED,
                cancellationReason: "Payment method removed",
              },
            });

            for (const payment of booking.payment) {
              try {
                await deletePayment(payment.id, credential);
              } catch (e) {
                console.error(e);
              }
              await prisma.payment.delete({
                where: {
                  id: payment.id,
                },
              });
            }

            await prisma.attendee.deleteMany({
              where: {
                bookingId: booking.id,
              },
            });

            await prisma.bookingReference.deleteMany({
              where: {
                bookingId: booking.id,
              },
            });

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
            const tOrganizer = await getTranslation(booking?.user?.locale ?? "en", "common");
            await sendCancelledEmails(
              {
                type: booking?.eventType?.title as string,
                title: booking.title,
                description: booking.description,
                customInputs: isPrismaObjOrUndefined(booking.customInputs),
                ...getCalEventResponses({
                  bookingFields: booking.eventType?.bookingFields ?? null,
                  booking,
                }),
                startTime: booking.startTime.toISOString(),
                endTime: booking.endTime.toISOString(),
                organizer: {
                  email: booking?.userPrimaryEmail ?? (booking?.user?.email as string),
                  name: booking?.user?.name ?? "Nameless",
                  timeZone: booking?.user?.timeZone as string,
                  language: { translate: tOrganizer, locale: booking?.user?.locale ?? "en" },
                },
                attendees: attendeesList,
                uid: booking.uid,
                recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
                location: booking.location,
                destinationCalendar: booking.destinationCalendar
                  ? [booking.destinationCalendar]
                  : booking.user?.destinationCalendar
                  ? [booking.user?.destinationCalendar]
                  : [],
                cancellationReason: "Payment method removed by organizer",
                seatsPerTimeSlot: booking.eventType?.seatsPerTimeSlot,
                seatsShowAttendees: booking.eventType?.seatsShowAttendees,
              },
              {
                eventName: booking?.eventType?.eventName,
              }
            );
          }
        });
      }
    }
  }

  // if zapier get disconnected, delete zapier apiKey, delete zapier webhooks and cancel all scheduled jobs from zapier
  if (credential.app?.slug === "zapier") {
    await prisma.apiKey.deleteMany({
      where: {
        userId: ctx.user.id,
        appId: "zapier",
      },
    });
    await prisma.webhook.deleteMany({
      where: {
        userId: ctx.user.id,
        appId: "zapier",
      },
    });
    const bookingsWithScheduledJobs = await prisma.booking.findMany({
      where: {
        userId: ctx.user.id,
        scheduledJobs: {
          isEmpty: false,
        },
      },
    });
    for (const booking of bookingsWithScheduledJobs) {
      cancelScheduledJobs(booking, credential.appId);
    }
  }

  // Backwards compatibility. Selected calendars cascade on delete when deleting a credential
  // If it's a calendar remove it from the SelectedCalendars
  if (credential.app?.categories.includes(AppCategories.calendar)) {
    try {
      const calendar = await getCalendar(credential);

      const calendars = await calendar?.listCalendars();

      const calendarIds = calendars?.map((cal) => cal.externalId);

      await prisma.selectedCalendar.deleteMany({
        where: {
          userId: user.id,
          integration: credential.type as string,
          externalId: {
            in: calendarIds,
          },
        },
      });
    } catch (error) {
      console.warn(
        `Error deleting selected calendars for userId: ${user.id} integration: ${credential.type}`,
        error
      );
    }
  }

  // Validated that credential is user's above
  await prisma.credential.delete({
    where: {
      id: id,
    },
  });
};
