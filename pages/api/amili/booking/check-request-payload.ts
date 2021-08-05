import prisma from "@lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import {
  checkBookingInThePast,
  checkTimeoutOfBounds,
  PropsSplitCredentials,
  splitCredentials,
} from "pages/api/book/[user]";
import { Logger } from "tslog";

import runMiddleware, { checkAmiliAuth } from "../../../../lib/amili/middleware";
import logger from "../../../../lib/logger";

const log = logger.getChildLogger({ prefix: ["[api] amili:booking:check-parameters"] });

type IPayload = {
  assEventTypeId: number;
  startTime: Date;
  endTime: Date;
  timezone: string;
};

export const checkRequestPayload = async (
  assEventTypeId: number,
  startTime: Date,
  endTime: Date,
  loggerInstance: Logger
): Promise<void> => {
  const selectedEventType = await prisma.eventType.findFirst({
    where: {
      id: assEventTypeId,
    },
    select: {
      eventName: true,
      title: true,
      length: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      user: true,
      userId: true,
    },
  });

  const { userId: organizerId } = selectedEventType;
  const currentUser = await prisma.user.findFirst({
    where: {
      id: organizerId,
    },
    select: {
      id: true,
      credentials: true,
      timeZone: true,
      email: true,
      name: true,
      username: true,
    },
  });

  if (!currentUser) {
    const error = {
      message: `User with id ${organizerId} unavailable!`,
    };

    throw { error, status: 400 };
  }

  await checkBookingInThePast(startTime, currentUser.username);

  const props: PropsSplitCredentials = {
    start: startTime,
    end: endTime,
    user: currentUser,
  };
  const { eventTypeOrganizer } = await splitCredentials(props);

  // checkIsAvailableToBeBooked({
  //   commonAvailability,
  //   start: startTime,
  //   selectedEventType,
  //   loggerInstance,
  //   organizerName: currentUser.name,
  // });

  const timeOutOfBounds = await checkTimeoutOfBounds({
    start: startTime,
    selectedEventType,
    loggerInstance,
    organizerTimezone: currentUser.timeZone,
    organizerName: currentUser.name,
  });

  if (timeOutOfBounds) {
    const error = {
      errorCode: "§",
      message: `${eventTypeOrganizer.name} is unavailable at this time.`,
    };

    loggerInstance.debug(`Booking ${currentUser.username} failed`, error);

    throw { error, status: 400 };
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { body, method } = req;

  if (method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await runMiddleware(req, res, checkAmiliAuth);

  const { assEventTypeId, startTime, endTime } = body as IPayload;

  try {
    await checkRequestPayload(assEventTypeId, startTime, endTime, log);

    return res.status(200).json({});
  } catch (e) {
    const { error, status } = e;

    return res.status(status).json(error);
  }
};

export default handler;
