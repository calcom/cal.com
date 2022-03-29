
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

type ResponseData = {
  message?: string;
  error?: unknown;
};

export async function deleteApiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = await schemaQueryIdAsString.safeParse(req.query);
  if (safe.success) {
    const data = await prisma.apiKey
      .delete({ where: { id: safe.data.id } })
    // We only remove the apiKey type from the database if there's an existing resource.
    if (data) res.status(200).json({ message: `ApiKey with id: ${safe.data.id} deleted successfully` });
    // This catches the error thrown by prisma.apiKey.delete() if the resource is not found.
    else res.status(400).json({ message: `ApiKey with id: ${safe.data.id} was not able to be processed` });
  }
}

export default withMiddleware("deleteOnly", "addRequestId")(
  withValidQueryIdString(
    deleteApiKey
  )
);
