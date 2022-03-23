import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

// This local import doesn't work
// import { PrismaClient } from "@calcom/prisma";
const prisma = new PrismaClient();

type Data = {
  message: string;
};

export default async function userId(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { id }: { id?: string } = req.query;
  if (!id) return res.status(404).json({ message: `User not found` });
  const user = await prisma.user.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  return res.json({ message: `Hello ${user?.name}` });
}
