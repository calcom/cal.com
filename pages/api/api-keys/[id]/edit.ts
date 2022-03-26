import prisma from "@calcom/prisma";

import { ApiKey } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaApiKey, withValidApiKey } from "@lib/validations/apiKey";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/queryIdString";

type ResponseData = {
  data?: ApiKey;
  message?: string;
  error?: unknown;
};

export async function editApiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdAsString.safeParse(query);
  const safeBody = await schemaApiKey.safeParse(body);

  if (method === "PATCH") {
    if (safeQuery.success && safeBody.success) {
      await prisma.apiKey.update({
        where: { id: safeQuery.data.id },
        data: safeBody.data,
      }).then(apiKey => {
        res.status(200).json({ data: apiKey });
      }).catch(error => {
        console.log(error)
        res.status(404).json({ message: `apiKey with ID ${safeQuery.data.id} not found and wasn't updated`, error })
      });
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ message: "Only PATCH Method allowed for updating API keys"  });
  }
}

export default withValidQueryIdString(withValidApiKey(editApiKey));
