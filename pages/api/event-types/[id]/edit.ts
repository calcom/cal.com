import { PrismaClient, EventType } from "@prisma/client";
import schemaQuery from "lib/validations/queryIdTransformParseInt";
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

type ResponseData = {
  data?: EventType;
  error?: any;
};

export async function editEventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQuery.safeParse(query);
  const safeBody = await schema.safeParse(body);

  if (safeQuery.success && safeBody.success) {
    if (method === "PATCH") {
      const event = await prisma.eventType.update({
        where: { id: safeQuery.data.id },
        data: { ...safeBody.data },
      });
      if (event) res.status(200).json({ data: event });
      if (!event) res.status(404).json({ error: "Event type not found" });
    } else {
      // Reject any other HTTP method than POST
      res.status(405).json({ error: "Only GET Method allowed" });
    }
  }
}

const validate = withValidation({
  schema,
  type: "Zod",
  mode: "body",
});

export default validate(editEventType);
