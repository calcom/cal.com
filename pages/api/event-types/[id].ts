import { PrismaClient, EventType } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { withValidation } from "next-validations";
import { z } from "zod";

const prisma = new PrismaClient();

const schema = z
  .object({
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
      try {
        const event = await prisma.eventType.findUnique({ where: { id: safe.data.id } });
        res.status(200).json({ data: event });
      } catch (error) {
        console.log(error);
        res.status(400).json({ error: error });
      }
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only GET Method allowed" });
  }
}

export default validate(eventType);
