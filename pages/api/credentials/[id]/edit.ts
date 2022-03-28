import prisma from "@calcom/prisma";

import { Credential } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaCredential, withValidCredential } from "@lib/validations/credential";
import { schemaQueryIdParseInt, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Credential;
  message?: string;
  error?: unknown;
};

export async function editCredential(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaCredential.safeParse(body);

  if (method === "PATCH" && safeQuery.success && safeBody.success) {
      const data = await prisma.credential.update({
        where: { id: safeQuery.data.id },
        data: safeBody.data,
      })
    if (data) res.status(200).json({ data });
    else res.status(404).json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error })

    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only PATCH Method allowed for updating credentials"  });
}

export default withValidQueryIdTransformParseInt(withValidCredential(editCredential));
