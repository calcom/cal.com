import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { UserResponse } from "@lib/types";
import { schemaUserBodyParams, schemaUserPublic, withValidUser } from "@lib/validations/user";

async function createUser(req: NextApiRequest, res: NextApiResponse<UserResponse>) {
  const safe = schemaUserBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const user = await prisma.user.create({ data: safe.data });
  const data = schemaUserPublic.parse(user);

  if (data) res.status(201).json({ data, message: "User created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new user",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidUser(createUser));
