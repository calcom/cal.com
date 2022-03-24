import { PrismaClient, EventType } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { withValidation } from "next-validations";
import { z } from "zod";

const prisma = new PrismaClient();

const schema = z
  .object({
    // since nextjs parses query params as strings,
    // we need to cast them to numbers using z.transform() and parseInt()
    id: z
      .string()
      .regex(/^\d+$/)
      .transform((id) => parseInt(id)),
  })
  .strict();

const validate = withValidation({
  schema,
  type: "Zod",
  mode: "query",
});

type ResponseData = {
  data?: EventType;
  error?: any;
};

export async function eventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  if (method === "GET") {
    const safe = await schema.safeParse(query);
    if (safe.success) {
      const event = await prisma.eventType.findUnique({ where: { id: safe.data.id } });

      if (event) res.status(200).json({ data: event });
      if (!event) res.status(404).json({ error: "Event type not found" });
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only GET Method allowed" });
  }
}

export default validate(eventType);
