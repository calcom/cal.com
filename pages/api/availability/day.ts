import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";

import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method == "PATCH") {
    const startMins = req.body.start;
    const endMins = req.body.end;
    const bufferMins = req.body.buffer;

    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        startTime: startMins,
        endTime: endMins,
        bufferTime: bufferMins,
      },
    });

    res.status(200).json({ message: "Start and end times updated successfully" });
  }
}
