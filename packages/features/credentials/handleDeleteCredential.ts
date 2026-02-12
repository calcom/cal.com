import z from "zod";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { DailyLocationType } from "@calcom/app-store/locations";
import {
  type EventTypeAppMetadataSchema,
  eventTypeAppMetadataOptionalSchema,
} from "@calcom/app-store/zod-utils";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { sendCancelledEmailsAndSMS } from "@calcom/emails/email-manager";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { deletePayment } from "@calcom/features/bookings/lib/payment/deletePayment";
import { deleteWebhookScheduledTriggers } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { buildNonDelegationCredential } from "@calcom/lib/delegationCredential";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { getTranslation } from "@calcom/lib/server/i18n";
import { bookingMinimalSelect, prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { AppCategories, BookingStatus } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";

type App = {
  slug: string;
  categories: AppCategories[];
  dirName: string;
} | null;

const isVideoOrConferencingApp = (app: App) =>
  app?.categories.includes(AppCategories.video) || app?.categories.includes(AppCategories.conferencing);

const getRemovedIntegrationNameFromAppSlug = (slug: string) =>
  slug === "msteams" ? "office365_video" : slug.split("-")[0];

const locationsSchema = z.array(z.object({ type: z.string() }));
type TlocationsSchema = z.infer<typeof locationsSchema>;

const handleDeleteCredential = async ({
  userId,
  userMetadata,
  credentialId,
  teamId,
}: {
  userId: number;
  userMetadata?: Prisma.JsonValue;
  credentialId: number;
  teamId?: number;
}) => {
  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      ...(teamId ? { teamId } : { userId }),
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
    throw new Error("Credential not found");
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      OR: [
        {
          ...(teamId ? { teamId } : { userId }),
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
    // If it's a video, replace the location with Cal video
    if (eventType.locations && isVideoOrConferencingApp(credential.app)) {
      // Find the user's event types

      const integrationQuery = getRemovedIntegrationNameFromAppSlug(credential.app?.slug ?? "");

      // Check if the event type uses the deleted integration

      // To avoid type errors, need to stringify and parse JSON to use array methods
      const locations = locationsSchema.parse(eventType.locations);

      const doesDailyVideoAlreadyExists = locations.some((location) =>
        location.type.includes(DailyLocationType)
      );

      const updatedLocations: TlocationsSchema = locations.reduce((acc: TlocationsSchema, location) => {
        if (location.type.includes(integrationQuery)) {
          if (!doesDailyVideoAlreadyExists) acc.push({ type: DailyLocationType });
        } else {
          acc.push(location);
        }
        return acc;
      }, []);

      await prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          locations: updatedLocations,
        },
      });
    }

    // If it's a calendar, remove the destination calendar from the event type
    if (
      credential.app?.categories.includes(AppCategories.calendar) &&
      eventType.destinationCalendar?.credential?.appId === credential.appId
    ) {
      const destinationCalendar = await prisma.destinationCalendar.findUnique({
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

    if (credential.app?.categories.includes(AppCategories.crm)) {
      const metadata = EventTypeMetaDataSchema.parse(eventType.metadata);
      const appSlugToDelete = credential.app?.slug;
      const apps = eventTypeAppMetadataOptionalSchema.parse(metadata?.apps);
      if (appSlugToDelete) {
        const appMetadata = removeAppFromEventTypeMetadata(appSlugToDelete, {
          apps,
        });

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
                  ...appMetadata,
                },
              },
            },
          });
        });
      }
    }

    // If it's a payment, hide the event type and set the price to 0. Also cancel all pending bookings
    if (credential.app?.categories.includes(AppCategories.payment)) {
      const metadata = EventTypeMetaDataSchema.parse(eventType.metadata);
      const appSlug = credential.app?.slug;
      if (appSlug) {
        const apps = eventTypeAppMetadataOptionalSchema.parse(metadata?.apps);
        const appMetadata = removeAppFromEventTypeMetadata(appSlug, {
          apps,
        });

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
                  ...appMetadata,
                },
              },
            },
          });

          // Only cancel unpaid pending bookings that:
          // 1. Are in the future (startTime > now) - don't cancel old bookings
          // 2. Have failed payments associated with the payment app being deleted
          const unpaidBookings = await prisma.booking.findMany({
            where: {
              userId: userId,
              eventTypeId: eventType.id,
              status: "PENDING",
              paid: false,
              startTime: {
                gt: new Date(),
              },
              payment: {
                some: {
                  appId: credential.appId,
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
                  profiles: {
                    select: {
                      organizationId: true,
                    },
                  },
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
                  hideOrganizerEmail: true,
                  team: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  metadata: true,
                },
              },
              uid: true,
              eventTypeId: true,
              destinationCalendar: true,
            },
          });

          const unpaidBookingsIds = unpaidBookings.map((booking) => booking.id);
          const unpaidBookingsPaymentIds = unpaidBookings.flatMap((booking) =>
            booking.payment.map((payment) => payment.id)
          );
          await prisma.booking.updateMany({
            where: {
              id: {
                in: unpaidBookingsIds,
              },
            },
            data: {
              status: BookingStatus.CANCELLED,
              cancellationReason: "Payment method removed",
            },
          });
          for (const paymentId of unpaidBookingsPaymentIds) {
            await deletePayment(paymentId, credential);
          }
          await prisma.payment.deleteMany({
            where: {
              id: {
                in: unpaidBookingsPaymentIds,
              },
            },
          });
          await prisma.attendee.deleteMany({
            where: {
              bookingId: {
                in: unpaidBookingsIds,
              },
            },
          });
          await prisma.bookingReference.updateMany({
            where: {
              bookingId: {
                in: unpaidBookingsIds,
              },
            },
            data: { deleted: true },
          });
          for (const booking of unpaidBookings) {
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
            await sendCancelledEmailsAndSMS(
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
                hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
                team: booking.eventType?.team
                  ? {
                      name: booking.eventType.team.name,
                      id: booking.eventType.team.id,
                      members: [],
                    }
                  : undefined,
                organizationId: booking.user?.profiles?.[0]?.organizationId ?? null,
              },
              {
                eventName: booking?.eventType?.eventName,
              },
              booking?.eventType?.metadata as EventTypeMetadata
            );
          }
        });
      }
    } else if (
      appStoreMetadata[credential.app?.slug as keyof typeof appStoreMetadata]?.extendsFeature === "EventType"
    ) {
      const metadata = eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata);
      const appSlug = credential.app?.slug;
      if (appSlug) {
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
      }
    }
  }

  // if zapier or make get disconnected, delete its apiKey, delete its webhooks and cancel all scheduled jobs
  if (credential.app?.slug === "zapier" || credential.app?.slug === "make") {
    const ownerFilter = teamId ? { teamId } : { userId };
    await prisma.apiKey.deleteMany({
      where: {
        ...ownerFilter,
        appId: credential.app.slug,
      },
    });
    await prisma.webhook.deleteMany({
      where: {
        ...ownerFilter,
        appId: credential.app.slug,
      },
    });

    deleteWebhookScheduledTriggers({
      appId: credential.appId,
      userId: teamId ? undefined : userId,
      teamId,
    });
  }

  let metadata = userMetadataSchema.parse(userMetadata);

  if (credential.app?.slug === metadata?.defaultConferencingApp?.appSlug) {
    metadata = {
      ...metadata,
      defaultConferencingApp: undefined,
    };
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        metadata,
      },
    });
  }

  // Backwards compatibility. Selected calendars cascade on delete when deleting a credential
  // If it's a calendar remove it from the SelectedCalendars
  if (credential.app?.categories.includes(AppCategories.calendar)) {
    try {
      const calendar = await getCalendar(buildNonDelegationCredential(credential), "slots");

      const calendars = await calendar?.listCalendars();

      const calendarIds = calendars?.map((cal) => cal.externalId);

      await prisma.selectedCalendar.deleteMany({
        where: {
          userId: userId,
          integration: credential.type as string,
          externalId: {
            in: calendarIds,
          },
        },
      });
    } catch (error) {
      console.warn(
        `Error deleting selected calendars for userId: ${userId} integration: ${credential.type}`,
        error
      );
    }
  }

  // Validated that credential is user's above
  await prisma.credential.delete({
    where: {
      id: credentialId,
    },
  });
};

const removeAppFromEventTypeMetadata = (
  appSlugToDelete: string,
  eventTypeMetadata: {
    apps: z.infer<typeof eventTypeAppMetadataOptionalSchema>;
  }
) => {
  const appMetadata = eventTypeMetadata?.apps
    ? Object.entries(eventTypeMetadata.apps).reduce(
        (filteredApps, [appName, appData]) => {
          if (appName !== appSlugToDelete) {
            filteredApps[appName as keyof typeof eventTypeMetadata.apps] = appData;
          }
          return filteredApps;
        },
        {} as z.infer<typeof EventTypeAppMetadataSchema>
      )
    : {};

  return appMetadata;
};

export default handleDeleteCredential;
