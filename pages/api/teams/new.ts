import prisma from "@calcom/prisma";

import { Team } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaTeam, withValidTeam } from "@lib/validations/team";

type ResponseData = {
  data?: Team;
  message?: string;
  error?: string;
};

async function createTeam(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  if (method === "POST") {
    const safe = schemaTeam.safeParse(body);
    if (safe.success && safe.data) {
      await prisma.team
        .create({ data: safe.data })
        .then((team) => res.status(201).json({ data: team }))
        .catch((error) => res.status(400).json({ message: "Could not create team", error: error }));
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default withValidTeam(createTeam);
