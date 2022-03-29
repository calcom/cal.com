import prisma from "@calcom/prisma";

import { User } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdParseInt, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";
import { withMiddleware } from "@lib/helpers/withMiddleware";

type ResponseData = {
  data?: User;
  message?: string;
  error?: unknown;
};

export async function userById(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (safe.success) {
    const data = await prisma.user.findUnique({ where: { id: safe.data.id } });

    if (data) res.status(200).json({ data });
    else res.status(404).json({ message: "User was not found" });
  }
}


export default withMiddleware("addRequestId","getOnly")(
  withValidQueryIdTransformParseInt(
    userById
  )
);
