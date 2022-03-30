import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Team } from "@calcom/prisma/client";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaTeam, withValidTeam } from "@lib/validations/team";

type ResponseData = {
  data?: Team;
  error?: object;
};

async function createTeam(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = schemaTeam.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body");

  const data = await prisma.team.create({ data: safe.data });

  if (data) res.status(201).json({ data });
  else
    (error: Error) =>
      res.status(400).json({
        error: {
          message: "Could not create new team",
          error,
        },
      });
}

export default withMiddleware("addRequestId", "HTTP_POST")(withValidTeam(createTeam));
