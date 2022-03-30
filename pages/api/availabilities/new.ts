import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Availability } from "@calcom/prisma/client";

import { schemaAvailability, withValidAvailability } from "@lib/validations/availability";

type ResponseData = {
  data?: Availability;
  message?: string;
  error?: string;
};

async function createAvailability(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  if (method === "POST") {
    const safe = schemaAvailability.safeParse(body);
    if (safe.success && safe.data) {
      await prisma.availability
        .create({ data: safe.data })
        .then((availability) => res.status(201).json({ data: availability }))
        .catch((error) =>
          res.status(400).json({ message: "Could not create availability type", error: error })
        );
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default withValidAvailability(createAvailability);
