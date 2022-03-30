import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Credential } from "@calcom/prisma/client";

import { schemaCredential, withValidCredential } from "@lib/validations/credential";

type ResponseData = {
  data?: Credential;
  message?: string;
  error?: string;
};

async function createCredential(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaCredential.safeParse(body);
  if (method === "POST" && safe.success) {
    await prisma.credential
      .create({ data: safe.data })
      .then((data) => res.status(201).json({ data }))
      .catch((error) => res.status(400).json({ message: "Could not create credential type", error: error }));
    // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidCredential(createCredential);
