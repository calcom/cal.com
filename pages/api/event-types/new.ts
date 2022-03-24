import { PrismaClient, EventType } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { withValidation } from "next-validations";
import { z } from "zod";

const prisma = new PrismaClient();

const schema = z
  .object({
    title: z.string().min(3),
    slug: z.string().min(3),
    length: z.number().min(1).max(1440), // max is a full day.
    description: z.string().min(3).optional(),
  })
  .strict(); // Adding strict so that we can disallow passing in extra fields

const validate = withValidation({
  schema,
  type: "Zod",
  mode: "body",
});

interface Body {
  title: string;
  slug: string;
  length: number;
}
type Data = {
  data?: EventType;
  error?: string;
};

type NextApiRequestWithBody = NextApiRequest & {
  body: Body;
};

async function createEventType(req: NextApiRequestWithBody, res: NextApiResponse<Data>) {
  const { body, method }: { body: Body; method?: string } = req;
  if (method === "POST") {
    schema.safeParse(body);
    const newEvent = await prisma.eventType.create({ data: body });
    res.status(201).json({ data: newEvent });
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default validate(createEventType);
