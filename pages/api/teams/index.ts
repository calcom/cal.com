import prisma from "@calcom/prisma";

import { Team } from "@calcom/prisma/client";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: Team[];
  error?: unknown;
};

async function allTeams(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.team.findMany();

  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}

export default withMiddleware("addRequestId","getOnly")(allTeams);