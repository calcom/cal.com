import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Team } from "@calcom/prisma/client";

import { withMiddleware } from "@lib/helpers/withMiddleware";

type ResponseData = {
  data?: Team[];
  message?: string;
  error?: object;
};

async function allTeams(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.team.findMany();

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(400).json({
        message: "No Teams were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allTeams);
