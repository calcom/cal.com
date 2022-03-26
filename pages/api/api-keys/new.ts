import prisma from "@calcom/prisma";

import { ApiKey } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaApiKey, withValidApiKey } from "@lib/validations/apiKey";

type ResponseData = {
  data?: ApiKey;
  message?: string;
  error?: string;
};

async function createApiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaApiKey.safeParse(body);
  if (method === "POST" && safe.success) {
      const apiKey = await prisma.apiKey
        .create({
          data: {
            ...safe.data, user: { connect: { id: 1 } }
          }
        })
        if (apiKey) {
          res.status(201).json({ data: apiKey });
        } else {
          res.status(404).json({message: "API Key not created"});
        }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default withValidApiKey(createApiKey);
