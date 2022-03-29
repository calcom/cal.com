import prisma from "@calcom/prisma";

import { SelectedCalendar } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaSelectedCalendar, withValidSelectedCalendar } from "@lib/validations/selected-calendar";

type ResponseData = {
  data?: SelectedCalendar;
  message?: string;
  error?: string;
};

async function createSelectedCalendar(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaSelectedCalendar.safeParse(body);
  if (method === "POST" && safe.success) {
      await prisma.selectedCalendar
        .create({ data: safe.data })
        .then((data) => res.status(201).json({ data }))
        .catch((error) => res.status(400).json({ message: "Could not create selectedCalendar type", error: error }));
        // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidSelectedCalendar(createSelectedCalendar);
