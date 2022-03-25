import { PrismaClient, ApiKey } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaApiKey, withValidApiKey } from "@lib/validations/apiKey";

const prisma = new PrismaClient();
type ResponseData = {
  data?: ApiKey;
  message?: string;
  error?: string;
};

async function createApiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  if (method === "POST") {
    const safe = schemaApiKey.safeParse(body);
    if (safe.success && safe.data) {
      await prisma.apiKey
        .create({ data: { ...safe.data, user: { connect: { id: 1 } }
}})
        .then((event) => res.status(201).json({ data: event }))
        .catch((error) => res.status(400).json({ message: "Could not create event type", error: error }));
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default withValidApiKey(createApiKey);
