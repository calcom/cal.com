import prisma from "@calcom/prisma";

import { User } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryId, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: User;
  message?: string;
  error?: unknown;
};

export async function user(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryId.safeParse(query);
  if (safe.success) {
    if (method === "GET") {
      const user = await prisma.user.findUnique({ where: { id: safe.data.id } });

      if (user) res.status(200).json({ data: user });
      if (!user) res.status(404).json({ message: "Event type not found" });
    } else {
      // Reject any other HTTP method than POST
      res.status(405).json({ message: "Only GET Method allowed" });
    }
  }
}


export default withValidQueryIdTransformParseInt(user);
