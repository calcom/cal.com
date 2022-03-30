import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { BookingReference } from "@calcom/prisma/client";

import { schemaBookingReference, withValidBookingReference } from "@lib/validations/booking-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: BookingReference;
  message?: string;
  error?: unknown;
};

export async function editBookingReference(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaBookingReference.safeParse(body);

  if (method === "PATCH" && safeQuery.success && safeBody.success) {
    const data = await prisma.bookingReference.update({
      where: { id: safeQuery.data.id },
      data: safeBody.data,
    });
    if (data) res.status(200).json({ data });
    else
      res
        .status(404)
        .json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated` });

    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only PATCH Method allowed for updating bookingReferences" });
}

export default withValidQueryIdTransformParseInt(withValidBookingReference(editBookingReference));
