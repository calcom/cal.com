import prisma from "@lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";
import _merge from "lodash.merge";

import runMiddleware, { checkAmiliAuth } from "../../../../lib/amili/middleware";
import logger from "../../../../lib/logger";
import { CalendarEvent } from "@lib/calendarClient";
import {
  getLocationRequestFromIntegration,
  PropsRescheduleBooking,
  PropsSplitCredentials,
  // rescheduleBooking,
  scheduleBooking,
  splitCredentials,
  User,
} from "pages/api/book/[user]";
// import EventAttendeeMail from "@lib/emails/EventAttendeeMail";
import { checkRequestPayload } from "./check-request-payload";

const translator = short();
const log = logger.getChildLogger({ prefix: ["[api] amili/booking:multiple"] });

type UserPayload = {
  id: string;
  firstName?: string;
  lastName?: string;
  assUserId: number;
  tenantId?: string;
};

enum BookingPaymentStatus {
  "PAID" = "PAID",
  "UNPAID" = "UNPAID",
}

type CoachProgram = {
  id: string;
  name: string;
  description: string;
};

type CoachProfile = {
  id: string;
  user: UserPayload;
};

type CoachProfileProgram = {
  id: string;
  coachUserId: string;
  programId: string;
  assEventTypeId: number;
  coachProgram: CoachProgram;
  coachProfile: CoachProfile;
};

type HealthCoachBooking = {
  id: string;
  userId: string;
  user: UserPayload;
  coachProfileProgramId: string;
  price: number;
  paymentStatus: BookingPaymentStatus;
  startTime: string;
  endTime: string;
  timezone: string;
  coachProfileProgram: CoachProfileProgram;
};

export type HealthCoachBookingSession = {
  id: string;
  coachBookingId: string;
  coachBooking: HealthCoachBooking;
  numberOfReschedule: number;
  startTime: Date;
  endTime: Date;
  timezone: string;
  assBookingId?: number;
  assBookingUid?: string;
};

type RequestPayload = {
  healthCoachBookingSession: HealthCoachBookingSession[];
  tenantId: string;
};

export const checkUserExisted = async (userId: number): Promise<[boolean, User]> => {
  let isExisted = false;

  try {
    const user = await prisma.user.findFirst({
      where: { id: +userId },
      select: {
        id: true,
        credentials: true,
        timeZone: true,
        email: true,
        name: true,
        username: true,
      },
    });

    isExisted = !!user;

    return [isExisted, user];
  } catch (e) {
    return [isExisted, null];
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method, body } = req;

  if (method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await runMiddleware(req, res, checkAmiliAuth);

  const { healthCoachBookingSession, tenantId } = body as RequestPayload;

  for await (const bookingSession of healthCoachBookingSession) {
    const { startTime, endTime, coachBooking } = bookingSession;
    const { coachProfileProgram } = coachBooking;
    const { assEventTypeId } = coachProfileProgram;

    await checkRequestPayload(assEventTypeId, startTime, endTime, log);
  }

  const data = await Promise.all(
    healthCoachBookingSession.map(async (healthCoachBookingSessionItem) => {
      const { startTime, endTime, timezone, coachBooking, assBookingId, id } = healthCoachBookingSessionItem;

      const { coachProfileProgram } = coachBooking;
      const user = coachProfileProgram?.coachProfile?.user;

      const { assUserId } = user;
      const { assEventTypeId, coachProgram } = coachProfileProgram;
      const { name: title, description } = coachProgram;

      const [isExisted, reqAttendee] = await checkUserExisted(assUserId);

      if (!isExisted) {
        throw Error("The user not found!");
      }

      const { email, name } = reqAttendee;
      const selectedEventType = await prisma.eventType.findFirst({
        where: { id: assEventTypeId },
        select: {
          eventName: true,
          title: true,
          length: true,
          periodType: true,
          periodDays: true,
          periodStartDate: true,
          periodEndDate: true,
          periodCountCalendarDays: true,
          userId: true,
          user: true,
        },
      });

      const props: PropsSplitCredentials = {
        start: startTime,
        end: endTime,
        user: reqAttendee as User,
      };

      const { calendarCredentials, videoCredentials } = await splitCredentials(props);

      const attendees = [
        {
          tenantId,
          name,
          email,
          timeZone: timezone,
        },
      ];

      let evt: CalendarEvent = {
        title,
        description,
        attendees,
        startTime,
        endTime,
        type: selectedEventType.title,
        organizer: {
          email: selectedEventType.user.email,
          name: selectedEventType.user.name,
          timeZone: selectedEventType.user.timeZone,
        },
      };

      const rawLocation = "integrations:zoom"; // hard code location

      if (rawLocation?.includes("integration")) {
        const maybeLocationRequestObject = getLocationRequestFromIntegration({
          location: rawLocation,
        });

        evt = _merge(evt, maybeLocationRequestObject);
      }

      // const results = [];
      let referencesToCreate = [];

      if (assBookingId) {
        // const booking = await prisma.booking.findFirst({ where: { id: assBookingId } });
        // const props: PropsRescheduleBooking = {
        //   videoCredentials,
        //   calendarCredentials,
        //   evt,
        //   rescheduleUid: booking.uid,
        //   username: reqAttendee.username,
        // };
        // const { referencesToCreate: rescheduleReference } = await rescheduleBooking(props);
        // results = [...rescheduleResults];
        // referencesToCreate = [...rescheduleReference];
      } else {
        const props: PropsRescheduleBooking = {
          videoCredentials,
          calendarCredentials,
          evt,
          username: reqAttendee.username,
        };
        const { referencesToCreate: scheduleReference } = await scheduleBooking(props);
        // results = [...scheduleResults];
        referencesToCreate = [...scheduleReference];
      }

      const hashUID = translator.fromUUID(uuidv5(JSON.stringify(evt), uuidv5.URL));

      // if (results.length === 0) {
      //   // Legacy as well, as soon as we have a separate email integration class. Just used
      //   // to send an email even if there is no integration at all.
      //   try {
      //     const mail = new EventAttendeeMail(evt, hashUID);
      //     await mail.sendEmail();
      //   } catch (e) {
      //     log.error("Sending legacy event mail failed", e);
      //     log.error(`Booking ${user} failed`);

      //     throw { error: "Booking failed", status: 500 };
      //   }
      // }

      const newBooking = {
        startTime,
        endTime,
        title,
        description,
        userId: +assUserId,
        eventTypeId: +assEventTypeId,
        uid: hashUID,
        attendees: {
          create: attendees,
        },
        references: {
          create: referencesToCreate,
        },
      };

      const booking = await prisma.booking.create({ data: newBooking });

      return { sessionId: id, assBookingId: booking.id, assBookingUid: booking.uid };
    })
  );

  return res.status(201).json(data);
};

export default handler;
