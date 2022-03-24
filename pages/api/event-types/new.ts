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

type Data = {
  data?: EventType;
  error?: string;
};

async function createEventType(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { body, method } = req;
  if (method === "POST") {
    const safe = schema.safeParse(body);
    if (safe.success && safe.data) {
      await prisma.eventType
        .create({
          data: safe.data,
        })
        .then((event) => res.status(201).json({ data: event }))
        .catch((error) => {
          console.log(error);
          res.status(400).json({ error: "Could not create event type" });
        });
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default validate(createEventType);
