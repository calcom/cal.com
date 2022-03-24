import { PrismaClient, EventType } from "@prisma/client";
import schema from "lib/validations/queryIdTransformParseInt";
import type { NextApiRequest, NextApiResponse } from "next";
import { withValidation } from "next-validations";

const prisma = new PrismaClient();

type ResponseData = {
  message?: string;
  error?: any;
};

export async function eventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schema.safeParse(query);
  if (safe.success) {
    if (method === "DELETE") {
      // DELETE WILL DELETE THE EVENT TYPE
      prisma.eventType
        .delete({ where: { id: safe.data.id } })
        .then(() => {
          // We only remove the event type from the database if there's an existing resource.
          res.status(200).json({ message: `event-type with id: ${safe.data.id} deleted successfully` });
        })
        .catch((error) => {
          // This catches the error thrown by prisma.eventType.delete() if the resource is not found.
          res.status(400).json({ error: error });
        });
    } else {
      // Reject any other HTTP method than POST
      res.status(405).json({ error: "Only DELETE Method allowed in /event-types/[id]/delete endpoint" });
    }
  }
}

const validate = withValidation({
  schema,
  type: "Zod",
  mode: "query",
});

export default validate(eventType);
