import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { EventTypeCustomInput } from "@calcom/prisma/client";

import {
  schemaEventTypeCustomInput,
  withValidEventTypeCustomInput,
} from "@lib/validations/eventTypeCustomInput";

type ResponseData = {
  data?: EventTypeCustomInput;
  message?: string;
  error?: string;
};

async function createEventTypeCustomInput(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaEventTypeCustomInput.safeParse(body);
  if (method === "POST" && safe.success) {
    await prisma.eventTypeCustomInput
      .create({ data: safe.data })
      .then((data) => res.status(201).json({ data }))
      .catch((error) =>
        res.status(400).json({ message: "Could not create eventTypeCustomInput type", error: error })
      );
    // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidEventTypeCustomInput(createEventTypeCustomInput);
