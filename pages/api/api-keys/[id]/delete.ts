import prisma from "@calcom/prisma";
import { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

type ResponseData = {
  message?: string;
  error?: unknown;
};

export async function apiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryIdAsString.safeParse(query);
  if (method === "DELETE" && safe.success) {
      // DELETE WILL DELETE THE EVENT TYPE
      await prisma.apiKey
        .delete({ where: { id: safe.data.id } })
        .then(() => {
          // We only remove the api key from the database if there's an existing resource.
          res.status(204).json({ message: `api-key with id: ${safe.data.id} deleted successfully` });
        })
        .catch((error) => {
          // This catches the error thrown by prisma.apiKey.delete() if the resource is not found.
          res.status(404).json({ message: `Resource with id:${safe.data.id} was not found`, error: error });
        });
  } else {
      // Reject any other HTTP method than POST
      res.status(405).json({ message: "Only DELETE Method allowed" });
    }
}

export default withValidQueryIdString(apiKey);
