import { randomBytes } from "crypto";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import dayjs from "@calcom/dayjs";
import type {
  CreateInstantBookingData,
  InstantBookingCreateResult,
} from "@calcom/features/bookings/lib/dto/types";
import getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getBookingData } from "@calcom/features/bookings/lib/handleNewBooking/getBookingData";
import { getCustomInputsResponses } from "@calcom/features/bookings/lib/handleNewBooking/getCustomInputsResponses";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IBookingCreateService } from "@calcom/features/bookings/lib/interfaces/IBookingCreateService";
import { createInstantMeetingWithCalVideo } from "@calcom/features/conferencing/lib/videoClient";
import { getFullName } from "@calcom/features/form-builder/utils";
import { sendNotification } from "@calcom/features/notifications/sendNotification";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { WEBAPP_URL } from "@calcom/lib/constants";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

import { instantMeetingSubscriptionSchema as subscriptionSchema } from "../dto/schema";

interface IInstantBookingCreateServiceDependencies {
  prismaClient: PrismaClient;
}

const handleInstantMeetingWebhookTrigger = async (args: {
  eventTypeId: number;
  webhookData: Record<string, unknown>;
  teamId: number;
  prismaClient: PrismaClient;
}) => {
  const orgId = (await getOrgIdFromMemberOrTeamId({ teamId: args.teamId })) ?? 0;
  const { prismaClient: prisma } = args;
  try {
    const eventTrigger = WebhookTriggerEvents.INSTANT_MEETING;

    const subscribers = await prisma.webhook.findMany({
      where: {
        OR: [
          {
            teamId: {
              in: [orgId, args.teamId],
            },
          },
          {
            eventTypeId: args.eventTypeId,
          },
        ],
        AND: {
          eventTriggers: {
            has: eventTrigger,
          },
          active: {
            equals: true,
          },
        },
      },
      select: {
        id: true,
        subscriberUrl: true,
        payloadTemplate: true,
        appId: true,
        secret: true,
      },
    });

    const { webhookData } = args;

    const promises = subscribers.map((sub) => {
      sendGenericWebhookPayload({
        secretKey: sub.secret,
        triggerEvent: eventTrigger,
        createdAt: new Date().toISOString(),
        webhook: sub,
        data: webhookData,
      }).catch((e) => {
        console.error(
          `Error executing webhook for event: ${eventTrigger}, URL: ${sub.subscriberUrl}`,
          sub,
          e
        );
      });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error executing webhook", error);
    logger.error("Error while sending webhook", error);
  }
};

const triggerBrowserNotifications = async (args: {
  title: string;
  connectAndJoinUrl: string;
  teamId?: number | null;
  prismaClient: PrismaClient;
}) => {
  const { title, connectAndJoinUrl, teamId, prismaClient: prisma } = args;

  if (!teamId) {
    logger.warn("No teamId provided, skipping browser notification trigger");
    return;
  }

  const subscribers = await prisma.membership.findMany({
    where: {
      teamId,
      accepted: true,
    },
    select: {
      user: {
        select: {
          id: true,
          NotificationsSubscriptions: {
            select: {
              id: true,
              subscription: true,
            },
          },
        },
      },
    },
  });

  const promises = subscribers.map((sub) => {
    const subscription = sub.user?.NotificationsSubscriptions?.[0]?.subscription;
    if (!subscription) return Promise.resolve();

    const parsedSubscription = subscriptionSchema.safeParse(JSON.parse(subscription));

    if (!parsedSubscription.success) {
      logger.error("Invalid subscription", parsedSubscription.error, JSON.stringify(sub.user));
      return Promise.resolve();
    }

    return sendNotification({
      subscription: {
        endpoint: parsedSubscription.data.endpoint,
        keys: {
          auth: parsedSubscription.data.keys.auth,
          p256dh: parsedSubscription.data.keys.p256dh,
        },
      },
      title: title,
      body: "User is waiting for you to join. Click to Connect",
      url: connectAndJoinUrl,
      type: "INSTANT_MEETING",
      requireInteraction: false,
    });
  });

  await Promise.allSettled(promises);
};

export async function handler(
  bookingData: CreateInstantBookingData,
  deps: IInstantBookingCreateServiceDependencies
) {
  // TODO: In a followup PR, we aim to remove prisma dependency and instead inject the repositories as dependencies.
  const { prismaClient: prisma } = deps;
  let eventType = await getEventTypesFromDB(bookingData.eventTypeId);
  const isOrgTeamEvent = !!eventType?.team && !!eventType?.team?.parentId;
  eventType = {
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields({ ...eventType, isOrgTeamEvent }),
  };

  if (!eventType.team?.id) {
    throw new Error("Only Team Event Types are supported for Instant Meeting");
  }

  const schema = getBookingDataSchema({
    view: bookingData?.rescheduleUid ? "reschedule" : "booking",
    bookingFields: eventType.bookingFields,
  });
  const reqBody = await getBookingData({
    reqBody: bookingData,
    eventType,
    schema,
  });
  const { email: bookerEmail, name: bookerName } = reqBody;

  const translator = short();
  const seed = `${reqBody.email}:${dayjs(reqBody.start).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  const customInputs = getCustomInputsResponses(reqBody, eventType.customInputs);
  const attendeeTimezone = reqBody.timeZone;
  const attendeeLanguage = reqBody.language;
  const tAttendees = await getTranslation(attendeeLanguage ?? "en", "common");
  const tEnglish = await getTranslation("en", "common");

  const fullName = getFullName(bookerName);

  // Determine whether to auto-translate the instant meeting title based on the event type setting
  // Default is true (opt-out), so we only skip translation when explicitly set to false
  const shouldAutoTranslateInstantMeetingTitle = eventType.autoTranslateInstantMeetingTitleEnabled;

  // Get the booking title - either translated to attendee's language or in English
  const bookingTitle = shouldAutoTranslateInstantMeetingTitle
    ? tAttendees("instant_meeting_with_title", { name: fullName })
    : tEnglish("instant_meeting_with_title", { name: fullName });

  const invitee = [
    {
      email: bookerEmail,
      name: fullName,
      timeZone: attendeeTimezone,
      locale: attendeeLanguage ?? "en",
      phoneNumber: reqBody.attendeePhoneNumber ?? null,
    },
  ];

  const guests = (reqBody.guests || []).reduce((guestArray, guest) => {
    guestArray.push({
      email: guest,
      name: "",
      timeZone: attendeeTimezone,
      locale: "en",
      phoneNumber: null,
    });
    return guestArray;
  }, [] as typeof invitee);

  const attendeesList = [...invitee, ...guests];
  const calVideoMeeting = await createInstantMeetingWithCalVideo(dayjs.utc(reqBody.end).toISOString());

  if (!calVideoMeeting) {
    throw new Error("Cal Video Meeting Creation Failed");
  }

  const bookingReferenceToCreate = [
    {
      type: calVideoMeeting.type,
      uid: calVideoMeeting.id,
      meetingId: calVideoMeeting.id,
      meetingPassword: calVideoMeeting.password,
      meetingUrl: calVideoMeeting.url,
    },
  ];

  // Create Partial
  const newBookingData: Prisma.BookingCreateInput = {
    uid,
    responses: reqBody.responses === null ? Prisma.JsonNull : reqBody.responses,
    title: bookingTitle,
    startTime: dayjs.utc(reqBody.start).toDate(),
    endTime: dayjs.utc(reqBody.end).toDate(),
    description: reqBody.notes,
    customInputs: isPrismaObjOrUndefined(customInputs),
    status: BookingStatus.AWAITING_HOST,
    references: {
      create: bookingReferenceToCreate,
    },
    location: "integrations:daily",
    eventType: {
      connect: {
        id: reqBody.eventTypeId,
      },
    },
    metadata: { ...reqBody.metadata, videoCallUrl: `${WEBAPP_URL}/video/${uid}` },
    attendees: {
      createMany: {
        data: attendeesList,
      },
    },
    creationSource: bookingData.creationSource,
  };

  const createBookingObj = {
    include: {
      attendees: true,
    },
    data: newBookingData,
  };

  const newBooking = await prisma.booking.create(createBookingObj);

  // Create Instant Meeting Token

  const token = randomBytes(32).toString("hex");

  const instantMeetingExpiryTimeOffsetInSeconds = eventType.instantMeetingExpiryTimeOffsetInSeconds ?? 90;

  const instantMeetingToken = await prisma.instantMeetingToken.create({
    data: {
      token,
      // current time + offset Seconds
      expires: new Date(new Date().getTime() + 1000 * instantMeetingExpiryTimeOffsetInSeconds),
      team: {
        connect: {
          id: eventType.team.id,
        },
      },
      booking: {
        connect: {
          id: newBooking.id,
        },
      },
      updatedAt: new Date().toISOString(),
    },
  });

  // Trigger Webhook
  const webhookData = {
    triggerEvent: WebhookTriggerEvents.INSTANT_MEETING,
    uid: newBooking.uid,
    responses: newBooking.responses,
    connectAndJoinUrl: `${WEBAPP_URL}/connect-and-join?token=${token}`,
    eventTypeId: eventType.id,
    eventTypeTitle: eventType.title,
    customInputs: newBooking.customInputs,
  };

  await handleInstantMeetingWebhookTrigger({
    eventTypeId: eventType.id,
    webhookData,
    teamId: eventType.team?.id,
    prismaClient: prisma,
  });

  await triggerBrowserNotifications({
    title: newBooking.title,
    connectAndJoinUrl: webhookData.connectAndJoinUrl,
    teamId: eventType.team?.id,
    prismaClient: prisma,
  });

  return {
    message: "Success",
    meetingTokenId: instantMeetingToken.id,
    bookingId: newBooking.id,
    bookingUid: newBooking.uid,
    expires: instantMeetingToken.expires,
    userId: newBooking.userId,
  } satisfies InstantBookingCreateResult;
}

/**
 * Instant booking service that handles instant/immediate bookings
 */
export class InstantBookingCreateService implements IBookingCreateService {
  constructor(private readonly deps: IInstantBookingCreateServiceDependencies) {}

  async createBooking(input: { bookingData: CreateInstantBookingData }): Promise<InstantBookingCreateResult> {
    return handler(input.bookingData, this.deps);
  }
}
