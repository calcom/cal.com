import prisma from "@calcom/prisma";

import { Team } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryId, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Team;
  message?: string;
  error?: unknown;
};

export async function team(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryId.safeParse(query);
  if (safe.success) {
    if (method === "GET") {
      const team = await prisma.team.findUnique({ where: { id: safe.data.id } });

      if (team) res.status(200).json({ data: team });
      if (!team) res.status(404).json({ message: "Event type not found" });
    } else {
      // Reject any other HTTP method than POST
      res.status(405).json({ message: "Only GET Method allowed" });
    }
  }
}


export default withValidQueryIdTransformParseInt(team);
