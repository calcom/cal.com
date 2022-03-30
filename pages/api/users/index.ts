import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { UsersResponse } from "@lib/types";
import { schemaUserPublic } from "@lib/validations/user";

async function allUsers(_: NextApiRequest, res: NextApiResponse<UsersResponse>) {
  const users = await prisma.user.findMany();
  const data = users.map((user) => schemaUserPublic.parse(user));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(400).json({
        message: "No Users were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allUsers);
