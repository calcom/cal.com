import { PrismaClient, EventType } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { withValidation } from "next-validations";

import schema from "@lib/validation/eventType";

const prisma = new PrismaClient();

const validate = withValidation({
  schema,
  type: "Zod",
  mode: "body",
});

type ResponseData = {
  data?: EventType;
  message?: string;
  error?: string;
};

async function createEventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  if (method === "POST") {
    const safe = schema.safeParse(body);
    if (safe.success && safe.data) {
      await prisma.eventType
        .create({ data: safe.data })
        .then((event) => res.status(201).json({ data: event }))
        .catch((error) => res.status(400).json({ message: "Could not create event type", error: error }));
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default validate(createEventType);
