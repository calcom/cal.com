import type { NextApiRequest, NextApiResponse } from "next";
import queue from "queue";
import { z, ZodError } from "zod";

import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { Reschedule } from "../lib";

const wipeMyCalendarBodySchema = z.object({
  initialDate: z.string(),
  endDate: z.string(),
});

/**
 * /api/integrations/wipemycalother/wipe
 * @param req
 * @param res
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  try {
    const { initialDate, endDate } = req.body;

    const todayBookings = await prisma.booking.findMany({
      where: {
        startTime: {
          gte: initialDate,
        },
        endTime: {
          lte: endDate,
        },
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.PENDING],
        },
        userId: req.session.user.id,
      },
      select: {
        id: true,
        uid: true,
        status: true,
      },
    });

    const q = queue({ results: [] });
    if (todayBookings.length > 0) {
      todayBookings.forEach((booking) =>
        q.push(() => {
          return Reschedule(booking.uid, "");
        })
      );
    }
    await q.start();
  } catch (error: unknown) {
    const httpError = getServerErrorFromUnknown(error);
    return res.status(httpError.statusCode).json({ message: httpError.message });
  }
  return res.status(200).json({ success: true });
};

function validate(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<NextApiResponse | void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
      try {
        wipeMyCalendarBodySchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError && error?.name === "ZodError") {
          return res.status(400).json(error?.issues);
        }
        return res.status(402);
      }
    } else {
      return res.status(405);
    }
    await handler(req, res);
  };
}

export default validate(handler);
