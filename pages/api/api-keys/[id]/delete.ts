import prisma from "@calcom/prisma";

import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";


type ResponseData = {
  message?: string;
  error?: unknown;
};

export async function apiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryIdAsString.safeParse(query);
  if (method === "DELETE" && safe.success && safe.data) {
    const apiKey = await prisma.apiKey
      .delete({ where: { id: safe.data.id } })
    // We only remove the apiKey type from the database if there's an existing resource.
    if (apiKey) res.status(200).json({ message: `apiKey with id: ${safe.data.id} deleted successfully` });
    // This catches the error thrown by prisma.apiKey.delete() if the resource is not found.
    else res.status(400).json({ message: `Resource with id:${safe.data.id} was not found`});
    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only DELETE Method allowed" });
}

export default withValidQueryIdString(apiKey);
