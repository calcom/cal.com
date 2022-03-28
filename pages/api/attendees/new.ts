import prisma from "@calcom/prisma";

import { Attendee } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaAttendee, withValidAttendee } from "@lib/validations/attendee";

type ResponseData = {
  data?: Attendee;
  message?: string;
  error?: string;
};

async function createAttendee(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaAttendee.safeParse(body);
  
  if (method === "POST" && safe.success) {
      await prisma.attendee
        .create({ data: safe.data })
        .then((attendee) => res.status(201).json({ data: attendee }))
        .catch((error) => res.status(400).json({ message: "Could not create attendee type", error: error }));
        // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidAttendee(createAttendee);
