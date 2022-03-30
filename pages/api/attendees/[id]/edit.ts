import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Attendee } from "@calcom/prisma/client";

import { schemaAttendee, withValidAttendee } from "@lib/validations/attendee";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Attendee;
  message?: string;
  error?: unknown;
};

export async function editAttendee(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaAttendee.safeParse(body);

  if (method === "PATCH" && safeQuery.success && safeBody.success) {
    await prisma.attendee
      .update({
        where: { id: safeQuery.data.id },
        data: safeBody.data,
      })
      .then((attendee) => {
        res.status(200).json({ data: attendee });
      })
      .catch((error) => {
        res
          .status(404)
          .json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error });
      });
    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only PATCH Method allowed for updating attendees" });
}

export default withValidQueryIdTransformParseInt(withValidAttendee(editAttendee));
