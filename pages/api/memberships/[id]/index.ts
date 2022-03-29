import prisma from "@calcom/prisma";

import { Membership } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdParseInt, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Membership;
  message?: string;
  error?: unknown;
};

export async function membership(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryIdParseInt.safeParse(query);
  if (method === "GET" && safe.success) {
    const data = await prisma.membership.findUnique({ where: { id: safe.data.id } });

    if (data) res.status(200).json({ data });
    else res.status(404).json({ message: "Event type not found" });
    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only GET Method allowed" });
}


export default withValidQueryIdTransformParseInt(membership);
