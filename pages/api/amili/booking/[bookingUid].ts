import prisma from "@lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import {
  getLocationRequestFromIntegration,
  PropsRescheduleBooking,
  PropsSplitCredentials,
  rescheduleBooking,
  splitCredentials,
} from "pages/api/book/[user]";
import _merge from "lodash.merge";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";

import runMiddleware, { checkAmiliAuth } from "../../../../lib/amili/middleware";
import { checkUserExisted, HealthCoachBookingSession } from "./multiple";
import { CalendarEvent } from "@lib/calendarClient";
// import { getMeeting } from "@lib/videoClient";

const translator = short();

interface IResponseRescheduleBooking {
  sessionId: string;
  assBookingId: number;
  assBookingUid: string;
}

const handleRescheduleBooking = async (
  payload: HealthCoachBookingSession
): Promise<IResponseRescheduleBooking> => {
  const { coachBooking, timezone, startTime, endTime, id, assBookingUid } = payload;
  const { coachProfileProgram, user: bookingUser, userProfile } = coachBooking;
  const user = coachProfileProgram?.coachProfile?.user;

  const { assUserId } = user;
  const { assEventTypeId } = coachProfileProgram;

  console.log({ startTime, endTime, timezone });

  const selectedEventType = await prisma.eventType.findFirst({
    where: { id: assEventTypeId },
    select: {
      description: true,
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

  const [isExisted, reqAttendee] = await checkUserExisted(assUserId);

  if (!isExisted) {
    throw Error("The user not found!");
  }

  const attendees = [
    {
      tenantId: bookingUser.tenantId,
      name: reqAttendee.name,
      email: reqAttendee.email,
      timeZone: timezone,
    },
    {
      tenantId: bookingUser.tenantId,
      name: `${userProfile.firstName} ${userProfile.lastName}`,
      email: bookingUser?.email,
      timeZone: timezone,
    },
  ];

  let evt: CalendarEvent = {
    title: selectedEventType.title,
    description: selectedEventType.description,
    attendees,
    startTime,
    endTime,
    type: selectedEventType.title,
    organizer: {
      email: selectedEventType.user.email,
      name: selectedEventType.user.name,
      timeZone: timezone,
    },
    location: "integrations:office365_video",
  };

  const rawLocation = "integrations:zoom"; // hard code location

  if (rawLocation?.includes("integration")) {
    const maybeLocationRequestObject = getLocationRequestFromIntegration({
      location: rawLocation,
    });

    evt = _merge(evt, maybeLocationRequestObject);
  }

  const props: PropsSplitCredentials = {
    start: startTime,
    end: endTime,
    user: reqAttendee,
  };

  const { calendarCredentials, videoCredentials } = await splitCredentials(props);

  const propsScheduleBooking: PropsRescheduleBooking = {
    videoCredentials,
    calendarCredentials,
    evt,
    rescheduleUid: assBookingUid,
    username: reqAttendee.username,
  };
  console.log({ propsScheduleBooking });
  const { referencesToCreate } = await rescheduleBooking(propsScheduleBooking);
  console.log({ referencesToCreate });
  const hashUID = translator.fromUUID(uuidv5(JSON.stringify(evt), uuidv5.URL));

  const newBookingData = {
    startTime,
    endTime,
    title: selectedEventType.title,
    description: selectedEventType.description,
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

  const newBooking = await prisma.booking.create({ data: newBookingData });
  return { sessionId: id, assBookingId: newBooking.id, assBookingUid: newBooking.uid };
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method, query, body } = req;
  const { bookingUid } = query;

  if (!["GET", "PATCH"].includes(method)) {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await runMiddleware(req, res, checkAmiliAuth);

  try {
    const booking = await prisma.booking.findFirst({
      where: { uid: <string>bookingUid },
      include: {
        references: true,
      },
    });

    if (!booking) {
      const error = {
        message: "The booking not found!",
      };

      throw { error, status: 404 };
    }

    if (method === "GET") {
      // get booking id
      // const credential = await prisma.credential.findFirst({ where: { userId: booking.userId } });
      const bookingRef = await prisma.bookingReference.findFirst({
        where: { bookingId: booking.id, type: "office365_video" },
      });
      // const meetingResult = await getMeeting(credential, bookingRef.uid);
      // const meeting = JSON.parse(meetingResult || {});
      return res.status(200).json({ ...booking, joinUrl: bookingRef?.meetingUrl });
    }

    if (method === "PATCH") {
      const result = await handleRescheduleBooking(body);

      return res.status(200).json(result);
    }
  } catch (e) {
    console.log({ e });
    const { error, status } = e;

    return res.status(status).json(error);
  }
};

export default handler;
