
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaQueryIdParseInt, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  message?: string;
  error?: unknown;
};

export async function deleteUser(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (safe.success) {
    const data = await prisma.user
      .delete({ where: { id: safe.data.id } })
    // We only remove the user type from the database if there's an existing resource.
    if (data) res.status(200).json({ message: `User with id: ${safe.data.id} deleted successfully` });
    // This catches the error thrown by prisma.user.delete() if the resource is not found.
    else res.status(400).json({ message: `User with id: ${safe.data.id} was not able to be processed` });
  }
}

export default withMiddleware("deleteOnly", "addRequestId")(
  withValidQueryIdTransformParseInt(
    deleteUser
  )
);
