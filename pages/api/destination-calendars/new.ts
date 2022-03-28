import prisma from "@calcom/prisma";

import { DestinationCalendar } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaDestinationCalendar, withValidDestinationCalendar } from "@lib/validations/destinationCalendar";

type ResponseData = {
  data?: DestinationCalendar;
  message?: string;
  error?: string;
};

async function createDestinationCalendar(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaDestinationCalendar.safeParse(body);
  if (method === "POST" && safe.success) {
      await prisma.destinationCalendar
        .create({ data: safe.data })
        .then((data) => res.status(201).json({ data }))
        .catch((error) => res.status(400).json({ message: "Could not create destinationCalendar type", error: error }));
        // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidDestinationCalendar(createDestinationCalendar);
