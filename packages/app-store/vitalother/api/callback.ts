import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

/**
 * This is will generate a user token for a client_user_id`
 * @param req
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = { vital_connected: true };
    await prisma.credential.create({
      data: {
        type: "vital_other",
        key: data as unknown as Prisma.InputJsonObject,
        userId: req.session?.user.id,
      },
    });
    return res.redirect("/apps/installed");
  } catch (e) {}
}
