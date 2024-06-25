import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import type { NextApiRequest } from "next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { createInstantMeetingWithCalVideo } from "@calcom/core/videoClient";
import dayjs from "@calcom/dayjs";
import getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import {
  getBookingData,
  getCustomInputsResponses,
  getEventTypesFromDB,
} from "@calcom/features/bookings/lib/handleNewBooking";
import { getFullName } from "@calcom/features/form-builder/utils";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

const handleInstantMeetingWebhookTrigger = async (args: {
  eventTypeId: number;
  webhookData: Record<string, unknown>;
  teamId: number;
}) => {
  const orgId = (await getOrgIdFromMemberOrTeamId({ teamId: args.teamId })) ?? 0;

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

async function handler(req: NextApiRequest) {
  let eventType = await getEventTypesFromDB(req.body.eventTypeId);
  eventType = {
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  };

  if (!eventType.team?.id) {
    throw new Error("Only Team Event Types are supported for Instant Meeting");
  }

  const schema = getBookingDataSchema({
    view: req.body?.rescheduleUid ? "reschedule" : "booking",
    bookingFields: eventType.bookingFields,
  });
  const reqBody = await getBookingData({
    req,
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

  const fullName = getFullName(bookerName);

  const invitee = [
    {
      email: bookerEmail,
      name: fullName,
      timeZone: attendeeTimezone,
      locale: attendeeLanguage ?? "en",
    },
  ];

  const guests = (reqBody.guests || []).reduce((guestArray, guest) => {
    guestArray.push({
      email: guest,
      name: "",
      timeZone: attendeeTimezone,
      locale: "en",
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
    title: tAttendees("instant_meeting_with_title", { name: invitee[0].name }),
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
  const instantMeetingToken = await prisma.instantMeetingToken.create({
    data: {
      token,
      // 90 Seconds
      expires: new Date(new Date().getTime() + 1000 * 90),
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
  });

  return {
    message: "Success",
    meetingTokenId: instantMeetingToken.id,
    bookingId: newBooking.id,
    expires: instantMeetingToken.expires,
  };
}

export default handler;
