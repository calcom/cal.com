import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Team } from "@calcom/prisma/client";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";
import { schemaTeam, withValidTeam } from "@lib/validations/team";

type ResponseData = {
  data?: Team;
  message?: string;
  error?: object;
};

export async function editTeam(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaTeam.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const data = await prisma.team.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware(
  "HTTP_PATCH",
  "addRequestId"
)(withValidQueryIdTransformParseInt(withValidTeam(editTeam)));
