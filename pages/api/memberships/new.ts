import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Membership } from "@calcom/prisma/client";

import { schemaMembership, withValidMembership } from "@lib/validations/membership";

type ResponseData = {
  data?: Membership;
  message?: string;
  error?: string;
};

async function createMembership(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaMembership.safeParse(body);
  if (method === "POST" && safe.success) {
    await prisma.membership
      .create({ data: safe.data })
      .then((data) => res.status(201).json({ data }))
      .catch((error) => res.status(400).json({ message: "Could not create membership type", error: error }));
    // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidMembership(createMembership);
