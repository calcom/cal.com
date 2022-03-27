import prisma from "@calcom/prisma";

import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdParseInt, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";


type ResponseData = {
  message?: string;
  error?: unknown;
};

export async function deleteUser(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryIdParseInt.safeParse(query);
  if (method === "DELETE" && safe.success && safe.data) {
    const user = await prisma.user
      .delete({ where: { id: safe.data.id } })
    // We only remove the user type from the database if there's an existing resource.
    if (user) res.status(200).json({ message: `user with id: ${safe.data.id} deleted successfully` });
    // This catches the error thrown by prisma.user.delete() if the resource is not found.
    else res.status(400).json({ message: `Resource with id:${safe.data.id} was not found`});
    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only DELETE Method allowed" });
}

export default withValidQueryIdTransformParseInt(deleteUser);
