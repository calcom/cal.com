import { PrismaClient, EventType } from "@prisma/client";
import schema from "lib/validations/queryIdTransformParseInt";
import type { NextApiRequest, NextApiResponse } from "next";
import { withValidation } from "next-validations";

const prisma = new PrismaClient();

type ResponseData = {
  data?: EventType;
  error?: any;
};

export async function eventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schema.safeParse(query);
  if (safe.success) {
    if (method === "GET") {
      const event = await prisma.eventType.findUnique({ where: { id: safe.data.id } });

      if (event) res.status(200).json({ data: event });
      if (!event) res.status(404).json({ error: "Event type not found" });
    } else if (method === "PATCH") {
      const event = await prisma.eventType.update({
        where: { id: safe.data.id },
        data: { title: "Updated title" },
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
  mode: "query",
});

export default validate(eventType);
