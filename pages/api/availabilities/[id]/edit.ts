import prisma from "@calcom/prisma";

import { Availability } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaAvailability, withValidAvailability,} from "@lib/validations/availability";
import { schemaQueryIdParseInt, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Availability;
  message?: string;
  error?: unknown;
};

export async function editAvailability(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaAvailability.safeParse(body);

  if (method === "PATCH" && safeQuery.success && safeBody.success) {
      await prisma.availability.update({
        where: { id: safeQuery.data.id },
        data: safeBody.data,
      }).then(availability => {
        res.status(200).json({ data: availability });
      }).catch(error => {
        res.status(404).json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error })
      });
      // Reject any other HTTP method than PATCH
  } else res.status(405).json({ message: "Only PATCH Method allowed for updating availabilities"  });
}

export default withValidQueryIdTransformParseInt(withValidAvailability(editAvailability));
