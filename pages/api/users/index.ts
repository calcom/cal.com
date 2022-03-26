import prisma from "@calcom/prisma";

import { User } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: User[];
  error?: unknown;
};

export default async function user(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json({ data: { ...users } });
  } catch (error) {
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
