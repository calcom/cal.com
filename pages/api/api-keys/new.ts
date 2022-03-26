import prisma from "@calcom/prisma";

import { ApiKey } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaApiKey, withValidApiKey } from "@lib/validations/apiKey";

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
        .create({
          data: {
            ...safe.data, user: { connect: { id: 1 } }
          }
        })
        .then((apiKey) => res.status(201).json({ data: apiKey }))
        .catch((error) => {
          // console.log(error);
          res.status(400).json({ message: "Could not create apiKey", error: error })
        }
        )
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default withValidApiKey(createApiKey);
