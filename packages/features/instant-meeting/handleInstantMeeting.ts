// import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import dayjs from "@calcom/dayjs";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import {
  getEventTypesFromDB,
  getBookingData,
  getCustomInputsResponses,
} from "@calcom/features/bookings/lib/handleNewBooking";
import { getFullName } from "@calcom/features/form-builder/utils";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import prisma from "@calcom/prisma";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

async function handler(req: NextApiRequest) {
  const body = req.body;

  let eventType = await getEventTypesFromDB(req.body.eventTypeId);
  eventType = {
    ...eventType,
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  };

  const reqBody = await getBookingData({
    req,
    isNotAnApiCall: true,
    eventType,
  });
  const { email: bookerEmail, name: bookerName } = reqBody;

  console.log("reqBody", reqBody);

  const translator = short();
  const seed = `${reqBody.email}:${dayjs(reqBody.start).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  const customInputs = getCustomInputsResponses(reqBody, eventType.customInputs);
  const attendeeTimezone = reqBody.timeZone;
  const attendeeLanguage = reqBody.language;

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

  const newBookingData: Prisma.BookingCreateInput = {
    uid,
    responses: reqBody.responses === null ? Prisma.JsonNull : reqBody.responses,
    // TODO
    title: "Get Title",
    startTime: dayjs.utc(reqBody.start).toDate(),
    endTime: dayjs.utc(reqBody.end).toDate(),
    description: reqBody.notes,
    customInputs: isPrismaObjOrUndefined(customInputs),
    // TODO
    status: BookingStatus.PENDING,
    location: reqBody.location,
    eventType: {
      connect: {
        id: reqBody.eventTypeId,
      },
    },
    metadata: reqBody.metadata,
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

  console.log("newBooking", newBooking);

  // Create Instant Meeting Token
  const token = "";

  // Trigger Webhook
  const subscriberOptions: GetSubscriberOptions = {
    userId: null,
    eventTypeId: body.eventTypeId,
    triggerEvent: WebhookTriggerEvents.INSTANT_MEETING,
    teamId: body.teamId,
  };

  // const webhookData = {};

  // await handleWebhookTrigger({
  //   subscriberOptions,
  //   eventTrigger: WebhookTriggerEvents.INSTANT_MEETING,
  //   webhookData,
  // });

  return { message: "Success", token };
}

export default handler;
