import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Team } from "@calcom/prisma/client";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Team;
  message?: string;
  error?: object;
};

export async function teamById(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const data = await prisma.team.findUnique({ where: { id: safe.data.id } });

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Team was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(teamById));
