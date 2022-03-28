import prisma from "@calcom/prisma";

import { DailyEventReference } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaDailyEventReference, withValidDailyEventReference } from "@lib/validations/dailyEventReference";

type ResponseData = {
  data?: DailyEventReference;
  message?: string;
  error?: string;
};

async function createDailyEventReference(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaDailyEventReference.safeParse(body);
  if (method === "POST" && safe.success) {
      await prisma.dailyEventReference
        .create({ data: safe.data })
        .then((data) => res.status(201).json({ data }))
        .catch((error) => res.status(400).json({ message: "Could not create dailyEventReference type", error: error }));
        // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidDailyEventReference(createDailyEventReference);
