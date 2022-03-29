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
  const safe = schemaUser.safeParse(req.body);
  if (safe.success) {
    const data = await prisma.user
      .create({ data: safe.data })
    if (data) res.status(201).json({ data })
    else (error: unknown) => res.status(400).json({ error: { message: "Could not create user type", error: error } });
  }
}

export default withMiddleware("addRequestId","postOnly")(
  withValidUser(
    createUser
  )
);
