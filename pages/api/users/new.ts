import prisma from "@calcom/prisma";

import { User } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaUser, withValidUser } from "@lib/validations/user";

type ResponseData = {
  data?: User;
  message?: string;
  error?: string;
};

async function createUser(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaUser.safeParse(body);
  if (method === "POST" && safe.success) {
      await prisma.user
        .create({ data: safe.data })
        .then((user) => res.status(201).json({ data: user }))
        .catch((error) => res.status(400).json({ message: "Could not create user type", error: error }));
        // Reject any other HTTP method than POST
  } else res.status(405).json({ error: "Only POST Method allowed" });
}

export default withValidUser(createUser);
