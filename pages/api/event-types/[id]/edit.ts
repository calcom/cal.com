import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { EventType } from "@calcom/prisma/client";

import { schemaEventType, withValidEventType } from "@lib/validations/eventType";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: EventType;
  message?: string;
  error?: unknown;
};

export async function editEventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaEventType.safeParse(body);

  if (method === "PATCH") {
    if (safeQuery.success && safeBody.success) {
      await prisma.eventType
        .update({
          where: { id: safeQuery.data.id },
          data: safeBody.data,
        })
        .then((event) => {
          res.status(200).json({ data: event });
        })
        .catch((error) => {
          res
            .status(404)
            .json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error });
        });
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ message: "Only PATCH Method allowed for updating event-types" });
  }
}

export default withValidQueryIdTransformParseInt(withValidEventType(editEventType));
