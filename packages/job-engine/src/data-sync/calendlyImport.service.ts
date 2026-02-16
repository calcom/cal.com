import type { WorkflowContext } from "@calid/job-dispatcher/src/adapter/index";
import type {
  CalendlyEventType,
  CalendlyScheduledEventLocation,
  CalendlyScheduledEvent,
  CalendlyScheduledEventInvitee,
  CalendlyUserAvailabilityRules,
  CalendlyUserAvailabilitySchedules,
} from "@onehash/calendly";
import { CalendlyAPIService, CalendlyOAuthProvider } from "@onehash/calendly";
import { BookingStatus, IntegrationProvider, SchedulingType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { sendImportDataEmail, sendCampaigningEmail } from "@calcom/emails/email-manager";
import type { CalendlyCampaignEmailProps } from "@calcom/emails/src/templates/CalendlyCampaignEmail";
import type { ImportDataEmailProps } from "@calcom/emails/src/templates/ImportDataEmail";
import { INNGEST_ID } from "@calcom/lib/constants";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { getServerTimezone } from "@calcom/lib/timezone";
import prisma from "@calcom/prisma";

import type { CalendlyImportJobData } from "../types/data-sync";

// ============================================================================
// TYPES
// ============================================================================

type CalendlyScheduledEventWithScheduler = CalendlyScheduledEvent & {
  scheduled_by: CalendlyScheduledEventInvitee[];
};

type EventTypeWithScheduledEvent = {
  event_type: CalendlyEventType;
  scheduled_events: CalendlyScheduledEventWithScheduler[];
};

type EventTypeWithScheduledEventInputSchema = {
  event_type_input: Prisma.EventTypeCreateInput;
  scheduled_events_input: Prisma.BookingCreateInput[];
};

type CombinedAvailabilityRules = {
  type: "wday" | "date";
  interval: {
    from: string;
    to: string;
  };
  wdays?: number[];
  date?: Date;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const quesTypeMapping: { [key: string]: string } = {
  string: "text",
  text: "text",
  phone_number: "phone",
  single_select: "select",
  multi_select: "multiselect",
};

const wdayMapping: { [key: string]: number } = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

const {
  NEXT_PUBLIC_CALENDLY_CLIENT_ID,
  CALENDLY_CLIENT_SECRET,
  NEXT_PUBLIC_CALENDLY_REDIRECT_URI,
  NEXT_PUBLIC_CALENDLY_OAUTH_URL,
} = process.env;

const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const updateTokensInDb = async (params: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  createdAt: number;
  expiresIn: number;
}) => {
  const updatedDoc = await prisma.integrationAccounts.update({
    where: {
      userId_provider: {
        userId: parseInt(params.userId),
        provider: IntegrationProvider.CALENDLY,
      },
    },
    data: {
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresIn: params.expiresIn,
      createdAt: params.createdAt,
    },
  });
  return updatedDoc;
};

const refreshTokenIfExpired = async (
  userCalendlyIntegrationProvider: {
    userId: number;
    provider: "CALENDLY";
    tokenType: string | null;
    expiresIn: number | null;
    createdAt: number | null;
    refreshToken: string;
    accessToken: string;
    scope: string | null;
    ownerUniqIdentifier: string | null;
  },
  userId: string
) => {
  const cOService = new CalendlyOAuthProvider({
    clientId: NEXT_PUBLIC_CALENDLY_CLIENT_ID ?? "",
    clientSecret: CALENDLY_CLIENT_SECRET ?? "",
    redirectUri: NEXT_PUBLIC_CALENDLY_REDIRECT_URI ?? "",
    oauthUrl: NEXT_PUBLIC_CALENDLY_OAUTH_URL ?? "",
  });

  const isTokenValid = await cOService.introspectToken({
    accessToken: userCalendlyIntegrationProvider.accessToken,
    refreshToken: userCalendlyIntegrationProvider.refreshToken,
  });

  if (!isTokenValid) {
    const freshTokenData = await cOService.requestNewAccessToken(
      userCalendlyIntegrationProvider.refreshToken
    );
    const updatedConfig = await updateTokensInDb({
      userId,
      accessToken: freshTokenData.access_token,
      refreshToken: freshTokenData.refresh_token,
      createdAt: freshTokenData.created_at,
      expiresIn: freshTokenData.expires_in,
    });
    userCalendlyIntegrationProvider.accessToken = updatedConfig.accessToken;
    userCalendlyIntegrationProvider.refreshToken = updatedConfig.refreshToken;
    userCalendlyIntegrationProvider.createdAt = updatedConfig.createdAt;
    userCalendlyIntegrationProvider.expiresIn = updatedConfig.expiresIn;
  }
};

const fetchCalendlyData = async (
  userId: number,
  ownerUniqIdentifier: string,
  cAService: CalendlyAPIService,
  ctx: WorkflowContext
): Promise<{
  userScheduledEvents: {
    events: CalendlyScheduledEvent[];
    hasNextPage: boolean;
  };
  userAvailabilitySchedules: CalendlyUserAvailabilitySchedules[];
  userEventTypes: CalendlyEventType[];
}> => {
  return await ctx.run("fetch-calendly-data", async () => {
    try {
      const userAvailabilitySchedules = await cAService.getUserAvailabilitySchedules({
        userUri: ownerUniqIdentifier,
        step: ctx as any,
      });

      const userEventTypes = await cAService.getUserEventTypes({
        userUri: ownerUniqIdentifier,
        active: true,
        step: ctx as any,
      });

      const sixHoursBefore = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      const calendlyNextPageUrl = isPrismaObjOrUndefined(existingUser?.metadata)?.calendlyNextPageUrl;
      const userScheduledEvents = await cAService.getUserScheduledEvents({
        userId,
        userUri: ownerUniqIdentifier,
        maxStartTime: sixHoursBefore.replace(/(\.\d{3})Z$/, "$1000Z"),
        step: ctx as any,
        ...(calendlyNextPageUrl && {
          next_page: calendlyNextPageUrl as string,
        }),
      });

      return {
        userScheduledEvents,
        userAvailabilitySchedules,
        userEventTypes,
      };
    } catch (error) {
      throw new Error(`fetchCalendlyData failed: ${error instanceof Error ? error.message : error}`);
    }
  });
};

const combinedRules = (rules: CalendlyUserAvailabilityRules[]): CombinedAvailabilityRules[] => {
  const combinedIntervals: { [key: string]: CombinedAvailabilityRules } = {};

  rules.forEach((rule) => {
    const ruleWInterval = rule.intervals?.find((interval) => interval.from && interval.to);
    if (!ruleWInterval) return;
    const key = `${ruleWInterval.from}-${ruleWInterval.to}`;
    if (rule.type === "wday" && rule.wday) {
      if (!combinedIntervals[key]) {
        combinedIntervals[key] = {
          type: "wday",
          interval: {
            from: ruleWInterval.from,
            to: ruleWInterval.to,
          },
          wdays: [wdayMapping[rule.wday]],
        };
      } else {
        combinedIntervals[key].wdays?.push(wdayMapping[rule.wday]);
      }
    } else if (rule.type === "date" && rule.date) {
      combinedIntervals[`${rule.date}-${key}`] = {
        type: "date",
        interval: ruleWInterval,
        date: new Date(rule.date),
      };
    }
  });
  return Object.values(combinedIntervals);
};

const getEventScheduler = async (
  userScheduledEvents: CalendlyScheduledEvent[],
  getUserScheduledEventInvitees: ({
    uuids,
    batch,
    step,
  }: {
    uuids: string[];
    batch: number;
    step: any;
  }) => Promise<{ uuid: string; invitees: CalendlyScheduledEventInvitee[] }[]>,
  ctx: WorkflowContext
): Promise<CalendlyScheduledEventWithScheduler[]> => {
  const userScheduledEventsWithScheduler: CalendlyScheduledEventWithScheduler[] = [];
  const batchSize = 9;

  const uuids = userScheduledEvents.map((event) => event.uri.substring(event.uri.lastIndexOf("/") + 1));

  for (let i = 0; i < uuids.length; i += batchSize) {
    const batchUuids = uuids.slice(i, i + batchSize);

    const inviteesResults = await ctx.run(`get-invitees-batch-${i / batchSize + 1}`, async () => {
      return await getUserScheduledEventInvitees({
        uuids: batchUuids,
        batch: i / batchSize + 1,
        step: ctx as any,
      });
    });

    const inviteesMap = new Map(inviteesResults.map(({ uuid, invitees }) => [uuid, invitees]));

    for (const userScheduledEvent of userScheduledEvents.slice(i, i + batchSize)) {
      const uuid = userScheduledEvent.uri.substring(userScheduledEvent.uri.lastIndexOf("/") + 1);
      const invitees = inviteesMap.get(uuid) || [];

      userScheduledEventsWithScheduler.push({
        ...userScheduledEvent,
        scheduled_by: invitees,
      });
    }
  }

  return userScheduledEventsWithScheduler;
};

const mergeEventTypeAndScheduledEvent = (
  eventTypeList: CalendlyEventType[],
  scheduledEventList: CalendlyScheduledEventWithScheduler[]
): EventTypeWithScheduledEvent[] => {
  try {
    const scheduledEventsMap: Record<string, CalendlyScheduledEventWithScheduler[]> = {};

    scheduledEventList.forEach((scheduledEvent) => {
      const eventTypeURI = scheduledEvent.event_type;

      if (!scheduledEventsMap[eventTypeURI]) {
        scheduledEventsMap[eventTypeURI] = [];
      }

      scheduledEventsMap[eventTypeURI].push(scheduledEvent);
    });

    return eventTypeList.map((eventType) => ({
      event_type: eventType,
      scheduled_events: scheduledEventsMap[eventType.uri] || [],
    }));
  } catch (error) {
    throw new Error(
      `mergeEventTypeAndScheduledEvent failed: ${error instanceof Error ? error.message : error}`
    );
  }
};

const getDateTimeISOString = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const currentDate = dayjs().utc();
  const dateWithTime = currentDate.set("hour", hours).set("minute", minutes);
  const formattedDate = dateWithTime.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  return formattedDate;
};

const getAttendeesWithTimezone = (
  scheduledEvent: CalendlyScheduledEventWithScheduler
): Prisma.AttendeeCreateWithoutBookingSeatInput[] => {
  const attendeeInput: Prisma.AttendeeCreateWithoutBookingSeatInput[] = [];

  for (const attendee of scheduledEvent.scheduled_by) {
    const timezone = attendee.timezone ?? getServerTimezone();

    const scheduledByAttendee: Prisma.AttendeeCreateWithoutBookingSeatInput = {
      name: attendee.name ?? "N/A",
      email: attendee.email ?? "N/A",
      timeZone: timezone,
    };
    attendeeInput.push(scheduledByAttendee);
  }

  const eventGuestTimezone = scheduledEvent.scheduled_by?.[0]?.timezone ?? getServerTimezone();

  if (scheduledEvent.event_guests && scheduledEvent.event_guests.length > 0) {
    const eventGuest: Prisma.AttendeeCreateWithoutBookingSeatInput[] = scheduledEvent.event_guests.map(
      (event_guest) => ({
        name: "",
        email: event_guest.email,
        timeZone: eventGuestTimezone,
      })
    );
    attendeeInput.push(...eventGuest);
  }

  return attendeeInput;
};

const importUserAvailability = async (
  userAvailabilitySchedules: CalendlyUserAvailabilitySchedules[],
  userIntID: number
) => {
  try {
    const parsedUserAvailabilitySchedules: Prisma.ScheduleCreateInput[] = userAvailabilitySchedules.map(
      (availabilitySchedule) => {
        const d: Prisma.ScheduleCreateInput = {
          user: { connect: { id: userIntID } },
          name: availabilitySchedule.name ?? "N/A",
          timeZone: availabilitySchedule.timezone,
          availability: {
            create: combinedRules(availabilitySchedule.rules).map((rule) => {
              return {
                startTime: getDateTimeISOString(rule.interval.from),
                endTime: getDateTimeISOString(rule.interval.to),
                days: rule.wdays,
                date: rule.date,
                userId: userIntID,
              };
            }),
          },
        };

        return d;
      }
    );

    const newAvailabilitySchedules = await getNewAvailabilitySchedules(
      userIntID,
      parsedUserAvailabilitySchedules
    );

    return await Promise.all(
      newAvailabilitySchedules.map((scheduleInput) =>
        prisma.schedule.create({
          data: scheduleInput,
        })
      )
    );
  } catch (error) {
    throw new Error(`importUserAvailability failed: ${error instanceof Error ? error.message : error}`);
  }
};

const handleBookingLocation = (
  location: CalendlyScheduledEventLocation
): {
  location: string;
  videoCallUrl?: string;
} => {
  switch (location.type) {
    case "physical":
      return {
        location: `In Person Meeting\nAt ${location.location}`,
      };

    case "outbound_call":
      return {
        location: `Phone Call\nGuest's contact number ${location.location}`,
      };
    case "inbound_call":
      return {
        location: `Phone Call\nHost's contact number ${location.location}`,
      };
    case "custom":
    case "ask_invitee":
      return {
        location: String(location.location),
      };
    case "google_conference":
      return {
        location: "integrations:google:meet",
        videoCallUrl: location.join_url,
      };
    case "zoom":
      return {
        location: "integrations:zoom",
        videoCallUrl: location.join_url,
      };

    case "microsoft_teams_conference":
      return {
        location: "integrations:office365_video",
        videoCallUrl: location.join_url,
      };
    case "webex_conference":
      return {
        location: "integrations:webex_video",
        videoCallUrl: location.join_url,
      };
    default:
      return {
        location: "",
      };
  }
};

const mapEventTypeAndBookingsToInputSchema = (
  mergedList: EventTypeWithScheduledEvent[],
  userIntID: number
): {
  event_type_input: Prisma.EventTypeCreateInput;
  scheduled_events_input: Prisma.BookingCreateInput[];
}[] => {
  return mergedList.map((mergedItem) => {
    const { event_type, scheduled_events } = mergedItem;

    const event_type_input: Prisma.EventTypeCreateInput = {
      title: event_type.name,
      slug: event_type.slug,
      description: event_type.description_plain,
      length: event_type.duration,
      hidden: event_type.secret,
      schedulingType:
        event_type.pooling_type === "collective"
          ? SchedulingType.COLLECTIVE
          : event_type.pooling_type === "round_robin"
          ? SchedulingType.ROUND_ROBIN
          : undefined,
      owner: { connect: { id: userIntID } },
      users: { connect: { id: userIntID } },
      bookingFields: event_type.custom_questions.map((q) => {
        return {
          name: q.name.split(" ").join("_"),
          type: quesTypeMapping[q.type],
          defaultLabel: q.name,
          hidden: !q.enabled,
          required: q.required,
          options: q.answer_choices.map((ch) => {
            return {
              label: ch,
              value: ch,
            };
          }),
          sources: [
            {
              id: "user",
              type: "user",
              label: "User",
            },
          ],
          editable: "user",
          placeholder: "",
        };
      }),
    };

    let scheduled_events_input: Prisma.BookingCreateInput[] = [];
    if (scheduled_events.length > 0) {
      scheduled_events_input = scheduled_events.map((scheduledEvent) => {
        const loc = handleBookingLocation(scheduledEvent.location);
        const metadata = { isImported: "yes" };
        const title =
          scheduledEvent.scheduled_by.length === 1
            ? `${scheduledEvent.name} between ${scheduledEvent.scheduled_by[0]?.name} and ${scheduledEvent.event_memberships[0].user_name}`
            : `Group ${scheduledEvent.name} `;
        const responses =
          scheduledEvent.scheduled_by.length === 1
            ? {
                name: scheduledEvent.scheduled_by[0]?.name ?? "N/A",
                email: scheduledEvent.scheduled_by[0]?.email ?? "N/A",
                guests: scheduledEvent.event_guests?.map((g) => g.email),
              }
            : {};
        const uid = scheduledEvent.uri.substring(scheduledEvent.uri.lastIndexOf("/") + 1) + userIntID;
        return {
          uid,
          user: { connect: { id: userIntID } },
          title: title,
          responses: responses,
          startTime: new Date(scheduledEvent.start_time),
          endTime: new Date(scheduledEvent.end_time),
          attendees: {
            createMany: {
              data: getAttendeesWithTimezone(scheduledEvent),
            },
          },
          customInputs: {},
          location: loc.location,
          createdAt: new Date(scheduledEvent.created_at),
          updatedAt: new Date(scheduledEvent.updated_at),
          status: scheduledEvent.status === "canceled" ? BookingStatus.CANCELLED : BookingStatus.ACCEPTED,
          ...(scheduledEvent.status === "canceled" && {
            cancellationReason: scheduledEvent.cancellation?.reason,
          }),
          metadata: {
            ...metadata,
            ...(loc.videoCallUrl && { videoCallUrl: loc.videoCallUrl }),
          },
        };
      });
    }
    return {
      event_type_input,
      scheduled_events_input,
    };
  });
};

const insertEventTypeAndBookingsToDB = async (
  eventTypesAndBookingsToBeInserted: EventTypeWithScheduledEventInputSchema[],
  userIntID: number,
  ctx: WorkflowContext
) => {
  const batchSize = 10;

  const processBatch = async (bookings: Prisma.BookingCreateInput[], eventTypeId: number) => {
    const bookingPromises = bookings.map((scheduledEvent) =>
      prisma.booking.upsert({
        where: { uid: scheduledEvent.uid },
        update: {},
        create: {
          ...scheduledEvent,
          eventType: { connect: { id: eventTypeId } },
        },
        include: {
          attendees: {
            select: {
              locale: true,
              name: true,
              email: true,
              timeZone: true,
            },
          },
        },
      })
    );

    return await Promise.all(bookingPromises);
  };

  try {
    const eventTypesAndBookingsInsertedResults = [];

    for (const eventTypeAndBooking of eventTypesAndBookingsToBeInserted) {
      const { event_type_input, scheduled_events_input } = eventTypeAndBooking;

      const eventType = await ctx.run(`upsert-eventtype-${event_type_input.slug}`, async () => {
        try {
          const _eventType = await prisma.eventType.upsert({
            create: event_type_input,
            update: {},
            where: {
              userId_slug: {
                userId: userIntID,
                slug: event_type_input.slug,
              },
            },
          });
          return _eventType;
        } catch (error) {
          throw new Error(`Upserting eventType failed: ${error instanceof Error ? error.message : error}`);
        }
      });

      const createdBookings = [];

      for (let i = 0; i < scheduled_events_input.length; i += batchSize) {
        const batch = scheduled_events_input.slice(i, i + batchSize);
        const bookingsInBatch = await ctx.run(`upsert-bookings-batch-${i / batchSize + 1}`, async () => {
          try {
            const _bookingsInBatch = await processBatch(batch, eventType.id);
            return _bookingsInBatch;
          } catch (error) {
            throw new Error(
              `Upserting bookings batch ${i / batchSize + 1} failed: ${
                error instanceof Error ? error.message : error
              }`
            );
          }
        });

        createdBookings.push(...bookingsInBatch);
      }

      eventTypesAndBookingsInsertedResults.push({ upsertedEventType: eventType, createdBookings });
    }

    return eventTypesAndBookingsInsertedResults;
  } catch (error) {
    throw new Error(
      `insertEventTypeAndBookingsToDB failed: ${error instanceof Error ? error.message : error}`
    );
  }
};

const getNewAvailabilitySchedules = async (
  userIntID: number,
  availabilitySchedules: Prisma.ScheduleCreateInput[]
): Promise<Prisma.ScheduleCreateInput[]> => {
  try {
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        user: { id: userIntID },
        name: { in: availabilitySchedules.map((schedule) => schedule.name) },
      },
      select: {
        name: true,
        userId: true,
      },
    });

    const existingSchedulesSet = new Set(
      existingSchedules.map((existing) => `${existing.name}-${existing.userId}`)
    );
    const newAvailabilitySchedules = availabilitySchedules.filter(
      (schedule) => !existingSchedulesSet.has(`${schedule.name}-${userIntID}`)
    );
    return newAvailabilitySchedules;
  } catch (error) {
    throw error;
  }
};

const importEventTypesAndBookings = async (
  userIntID: number,
  cAService: CalendlyAPIService,
  userScheduledEvents: CalendlyScheduledEvent[],
  userEventTypes: CalendlyEventType[],
  ctx: WorkflowContext
) => {
  try {
    if (userEventTypes.length === 0) {
      ctx.log("No user event-types found");
      return;
    }

    const userScheduledEventsWithScheduler: CalendlyScheduledEventWithScheduler[] = await getEventScheduler(
      userScheduledEvents,
      cAService.getUserScheduledEventInvitees,
      ctx
    );

    const mergedList = await ctx.run("map-bookings-to-event-type", async () => {
      try {
        const _mergedList = mergeEventTypeAndScheduledEvent(userEventTypes, userScheduledEventsWithScheduler);
        return _mergedList;
      } catch (error) {
        throw new Error(
          `mergeEventTypeAndScheduledEvent failed: ${error instanceof Error ? error.message : error}`
        );
      }
    });

    const eventTypesAndBookingsToBeInserted = await ctx.run("map-data-to-input-schema", async () => {
      try {
        const _eventTypesAndBookingsToBeInserted = mapEventTypeAndBookingsToInputSchema(
          mergedList,
          userIntID
        );
        return _eventTypesAndBookingsToBeInserted;
      } catch (error) {
        throw new Error(
          `mapEventTypeAndBookingsToInputSchema failed: ${error instanceof Error ? error.message : error}`
        );
      }
    });

    const eventTypesAndBookingsInsertedResults = await insertEventTypeAndBookingsToDB(
      eventTypesAndBookingsToBeInserted,
      userIntID,
      ctx
    );

    return eventTypesAndBookingsInsertedResults;
  } catch (error) {
    throw new Error(`importEventTypesAndBookings failed: ${error instanceof Error ? error.message : error}`);
  }
};

const sendCampaigningEmails = async (
  { fullName, slug, emails }: { fullName: string; slug: string; emails: string[] },
  ctx: WorkflowContext
) => {
  const batchSize = 10;
  const name = fullName.includes("@") ? fullName.split("@")[0] : fullName;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    await ctx.run(`email-campaign-batch-${i / batchSize + 1}`, async () => {
      try {
        await Promise.all(
          batch.map((batchEmail) =>
            sendBatchEmail({
              fullName: name,
              slug,
              email: batchEmail,
            })
          )
        );
        return { status: "success" };
      } catch (error) {
        throw new Error(
          `Email campaign batch ${i / batchSize + 1} failed: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    });
  }
};

const sendBatchEmail = async ({
  fullName,
  slug,
  email,
}: {
  fullName: string;
  slug: string;
  email: string;
}) => {
  try {
    const data: CalendlyCampaignEmailProps = {
      receiverEmail: email,
      user: {
        fullName,
        slug,
      },
    };
    await sendCampaigningEmail(data);
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// MAIN WORKFLOW EXPORT
// ============================================================================

export async function calendlyImportService(
  ctx: WorkflowContext,
  payload: CalendlyImportJobData
): Promise<void> {
  const { sendCampaignEmails, userCalendlyIntegrationProvider, user } = payload;

  try {
    const cAService = new CalendlyAPIService({
      accessToken: userCalendlyIntegrationProvider.accessToken,
      refreshToken: userCalendlyIntegrationProvider.refreshToken,
      clientID: NEXT_PUBLIC_CALENDLY_CLIENT_ID ?? "",
      clientSecret: CALENDLY_CLIENT_SECRET ?? "",
      oauthUrl: NEXT_PUBLIC_CALENDLY_OAUTH_URL ?? "",
      userId: user.id,
      createdAt: userCalendlyIntegrationProvider.createdAt,
      expiresIn: userCalendlyIntegrationProvider.expiresIn,
    });

    ctx.log("Starting Calendly import");

    // 0. Fetch user data from Calendly
    const { userAvailabilitySchedules, userEventTypes, userScheduledEvents } = await fetchCalendlyData(
      user.id,
      userCalendlyIntegrationProvider.ownerUniqIdentifier,
      cAService,
      ctx
    );

    ctx.log("Fetched Calendly data successfully");

    // 1. Import user availability schedules
    await ctx.run("import-user-availability", async () => {
      try {
        return await importUserAvailability(userAvailabilitySchedules, user.id);
      } catch (error) {
        throw new Error(`importUserAvailability failed: ${error instanceof Error ? error.message : error}`);
      }
    });

    ctx.log("Imported availability schedules");

    // 2. Import event types and bookings
    const importedData = await importEventTypesAndBookings(
      user.id,
      cAService,
      userScheduledEvents.events,
      userEventTypes,
      ctx
    );

    ctx.log("Imported event types and bookings");

    const allEventsProcessed = !userScheduledEvents.hasNextPage;

    if (allEventsProcessed) {
      // 3. Notify user
      await ctx.run("notify-user", async () => {
        try {
          const status = !!importedData;
          const data: ImportDataEmailProps = {
            status,
            provider: "Calendly",
            user: {
              email: user.email,
              name: user.name,
            },
          };
          await sendImportDataEmail(data);
          ctx.log(`User notified with ${status ? "success" : "failure"} import status`);
        } catch (error) {
          throw new Error(`Notify user failed: ${error instanceof Error ? error.message : error}`);
        }
      });

      ctx.log("User notified");

      // 4. Send campaign emails
      if (importedData && sendCampaignEmails) {
        await sendCampaigningEmails(
          {
            fullName: user.name,
            slug: user.slug,
            emails: Array.from(
              importedData.reduce<Set<string>>((emailsSet, event) => {
                event.createdBookings.forEach((booking) => {
                  booking.attendees.forEach((attendee) => {
                    if (attendee.email !== user.email) {
                      emailsSet.add(attendee.email);
                    }
                  });
                });
                return emailsSet;
              }, new Set())
            ),
          },
          ctx
        );
      }

      ctx.log("Calendly import completed successfully");
    } else {
      // Signal continuation required
      ctx.log("More events to process - continuation required");
      throw new Error("CONTINUATION_REQUIRED");
    }
  } catch (error) {
    // If it's the continuation signal, rethrow it
    if (error instanceof Error && error.message === "CONTINUATION_REQUIRED") {
      throw error;
    }

    // For actual errors, notify user of failure
    await ctx.run("notify-user-failure", async () => {
      const data: ImportDataEmailProps = {
        status: false,
        provider: "Calendly",
        user: {
          email: user.email,
          name: user.name,
        },
      };
      await sendImportDataEmail(data);
      ctx.log("User notified with failure import status");
    });

    throw new Error(`Calendly import failed: ${error instanceof Error ? error.message : error}`);
  }
}
