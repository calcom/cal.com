import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const users = await prisma.user.findMany();
  return res.status(200).json({ message: "Users fetched successfully", users });
}
