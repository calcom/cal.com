import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { User } from "@calcom/prisma/client";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaUser, withValidUser } from "@lib/validations/user";


type ResponseData = {
  data?: User;
  error?: object;
};

async function createUser(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  const safe = schemaUser.safeParse(body);
  if (method === "POST" && safe.success) {
    const data = await prisma.user
      .create({ data: safe.data })
    if (data) res.status(201).json({ data })
    else (error: unknown) => res.status(400).json({ error: { message: "Could not create user type", error: error } });
      // Reject any other HTTP method than POST
  } else res.status(405).json({ error: { message: "Only POST Method allowed" } });
}

export default withMiddleware("addRequestId")(withValidUser(createUser));
