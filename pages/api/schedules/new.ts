import prisma from "@calcom/prisma";

import { Schedule } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaSchedule, withValidSchedule } from "@lib/validations/schedule";

type ResponseData = {
  data?: Schedule;
  message?: string;
  error?: string;
};

async function createSchedule(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaSchedule.safeParse(body);
  if (method === "POST" && safe.success) {
      await prisma.schedule
        .create({ data: safe.data })
        .then((data) => res.status(201).json({ data }))
        .catch((error) => res.status(400).json({ message: "Could not create schedule type", error: error }));
        // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidSchedule(createSchedule);
