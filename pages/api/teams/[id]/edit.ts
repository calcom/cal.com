import prisma from "@calcom/prisma";

import { Team } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaTeam, withValidTeam } from "@lib/validations/team";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaQueryIdParseInt, withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Team;
  message?: string;
  error?: unknown;
};

export async function editTeam(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, body, method } = req;
  const safeQuery = await schemaQueryIdParseInt.safeParse(query);
  const safeBody = await schemaTeam.safeParse(body);

  if (safeQuery.success && safeBody.success) {
      const data = await prisma.team.update({
        where: { id: safeQuery.data.id },
        data: safeBody.data,
      })
    if (data) res.status(200).json({ data });
    else (error: unknown) => res.status(404).json({ message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`, error })
  }
}

export default withMiddleware("patchOnly","addRequestId")(
  withValidQueryIdTransformParseInt(
    withValidTeam(
      editTeam)
  )
);
