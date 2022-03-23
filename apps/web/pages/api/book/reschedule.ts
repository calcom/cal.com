import { BookingStatus } from "@prisma/client";
import dayjs from "dayjs";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";

import prisma from "@lib/prisma";

const rescheduleSchema = z.object({
  bookingId: z.string(),
  rescheduleReason: z.string().optional(),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { bookingId, rescheduleReason: cancellationReason } = req.body;
  try {
    const bookingToReschedule = await prisma.booking.findFirst({
      where: {
        uid: bookingId,
        NOT: {
          status: BookingStatus.CANCELLED,
        },
      },
    });
    if (bookingToReschedule) {
      await prisma.booking.update({
        where: {
          id: bookingToReschedule.id,
        },
        data: {
          rescheduled: true,
          cancellationReason,
          status: BookingStatus.CANCELLED,
          updatedAt: dayjs().toISOString(),
        },
      });
    }
    console.log({ bookingToReschedule });

    return res.status(200).json(bookingToReschedule);
  } catch (error) {
    console.log(error);
    // throw new Error(error?.message);
  }

  return res.status(204);
};

function validate(handler: NextApiHandler) {
  return async (req, res) => {
    if (req.method === "POST") {
      try {
        rescheduleSchema.parse(req.body);
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
