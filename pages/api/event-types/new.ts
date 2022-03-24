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

type schema = z.infer<typeof schema>;
const validate = withValidation({
  schema,
  type: "Zod",
  mode: "body",
});

// interface Body {
//   title: string;
//   slug: string;
//   length: number;
// }
type Data = {
  data?: EventType;
  error?: string;
};

type NextApiRequestWithBody = NextApiRequest & {
  // body: Body;
};

async function createEventType(req: NextApiRequestWithBody, res: NextApiResponse<Data>) {
  const { body, method } = req;
  if (method === "POST") {
    const safe = schema.safeParse(body);
    if (safe.success && safe.data) {
      await prisma.eventType
        .create({
          data: { title: safe.data.title, slug: safe.data.slug, length: safe.data.length },
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
