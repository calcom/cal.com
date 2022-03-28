import prisma from "@calcom/prisma";

import { User } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: User[];
  error?: unknown;
};
const dateInPast = function (firstDate: Date, secondDate: Date) {
  if (firstDate.setHours(0, 0, 0, 0) <= secondDate.setHours(0, 0, 0, 0)) {
    return true;
  }

  return false;
};
const today = new Date();

export default async function user(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const apiKey = req.query.apiKey as string;
  const apiInDb = await prisma.apiKey.findUnique({ where: { id: apiKey } });
  if (!apiInDb) throw new Error('API key not found');
  const { expiresAt } = apiInDb;
  // if (!apiInDb) res.status(400).json({ error: 'Your api key is not valid' });
  if (expiresAt && dateInPast(expiresAt, today)) {
    try {
      const data = await prisma.user.findMany();
      res.status(200).json({ data });
    } catch (error) {
      // FIXME: Add zod for validation/error handling
      res.status(400).json({ error: error });
    }
  } else       res.status(400).json({ error: 'Your api key is not valid' });

}
