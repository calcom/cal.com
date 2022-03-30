import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Booking } from "@calcom/prisma/client";

import { schemaBooking, withValidBooking } from "@lib/validations/booking";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Booking;
  message?: string;
  error?: unknown;
};

export async function editBooking(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaBooking.safeParse(body);

  if (method === "PATCH") {
    if (safeQuery.success && safeBody.success) {
      await prisma.booking
        .update({
          where: { id: safeQuery.data.id },
          data: safeBody.data,
        })
        .then((booking) => {
          res.status(200).json({ data: booking });
        })
        .catch((error) => {
          res
            .status(404)
            .json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error });
        });
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ message: "Only PATCH Method allowed for updating bookings" });
  }
}

export default withValidQueryIdTransformParseInt(withValidBooking(editBooking));
