import z from "zod";

import { cancelScheduledJobs } from "@calcom/app-store/zapier/lib/nodeScheduler";
import { DailyLocationType } from "@calcom/core/location";
import { sendCancelledEmails } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { deletePayment } from "@calcom/lib/payment/deletePayment";
import { getTranslation } from "@calcom/lib/server/i18n";
import { bookingMinimalSelect } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import { AppCategories, BookingStatus } from "@calcom/prisma/enums";
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
  const { id, externalId } = input;

  const credential = await prisma.credential.findFirst({
    where: {
      id: id,
      userId: ctx.user.id,
    },
    select: {
      key: true,
      appId: true,
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
      userId: ctx.user.id,
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
      if (credential.app?.categories.includes(AppCategories.video)) {
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
    if (credential.app?.categories.includes(AppCategories.calendar)) {
      if (eventType.destinationCalendar?.credential?.appId === credential.appId) {
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

      if (externalId) {
        const existingSelectedCalendar = await prisma.selectedCalendar.findFirst({
          where: {
            externalId: externalId,
          },
        });
        // @TODO: SelectedCalendar doesn't have unique ID so we should only delete one item
        if (existingSelectedCalendar) {
          await prisma.selectedCalendar.delete({
            where: {
              userId_integration_externalId: {
                userId: existingSelectedCalendar.userId,
                externalId: existingSelectedCalendar.externalId,
                integration: existingSelectedCalendar.integration,
              },
            },
          });
        }
      }
    }

    const metadata = EventTypeMetaDataSchema.parse(eventType.metadata);

    const stripeAppData = getPaymentAppData({ ...eventType, metadata });

    // If it's a payment, hide the event type and set the price to 0. Also cancel all pending bookings
    if (credential.app?.categories.includes(AppCategories.payment)) {
      if (stripeAppData.price) {
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
                  stripe: {
                    ...metadata?.apps?.stripe,
                    price: 0,
                  },
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
                  email: booking?.user?.email as string,
                  name: booking?.user?.name ?? "Nameless",
                  timeZone: booking?.user?.timeZone as string,
                  language: { translate: tOrganizer, locale: booking?.user?.locale ?? "en" },
                },
                attendees: attendeesList,
                uid: booking.uid,
                recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
                location: booking.location,
                destinationCalendar: booking.destinationCalendar || booking.user?.destinationCalendar,
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

  // Validated that credential is user's above
  await prisma.credential.delete({
    where: {
      id: id,
    },
  });
  // Revalidate user calendar cache.
  if (credential.app?.slug.includes("calendar")) {
    await fetch(`${WEBAPP_URL}/api/revalidate-calendar-cache/${ctx?.user?.username}`);
  }
};
