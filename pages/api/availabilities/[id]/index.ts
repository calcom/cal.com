import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Availability } from "@calcom/prisma/client";

import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Availability;
  message?: string;
  error?: unknown;
};

export async function availability(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryIdParseInt.safeParse(query);

  if (method === "GET" && safe.success) {
    const availability = await prisma.availability.findUnique({ where: { id: safe.data.id } });

    if (availability) res.status(200).json({ data: availability });
    if (!availability) res.status(404).json({ message: "Event type not found" });
    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only GET Method allowed" });
}

export default withValidQueryIdTransformParseInt(availability);
