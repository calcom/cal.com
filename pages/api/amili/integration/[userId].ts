import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { Credential } from ".prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<Credential[] | any> => {
  const { userId } = req.query;

  // Check valid method
  if (req.method !== "GET") res.status(405).json({});

  const credentials = await prisma.credential.findMany({
    where: {
      userId: +userId,
    },
  });

  return res.status(200).json({ integration: credentials });
};

export default handler;
