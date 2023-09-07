import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

// add middleware function with scrope to authorize JWT token
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.CALENDSO_ENCRYPTION_KEY);

    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
      },
      select: {
        username: true,
      },
    });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json("Verification failed");
  }
}
