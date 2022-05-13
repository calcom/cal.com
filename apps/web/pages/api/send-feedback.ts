import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🚀 ~ file: send-feedback.ts ~ line 7 ~ handler ~ req", req.body);
  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  console.log("🚀 ~ file: send-feedback.ts ~ line 8 ~ handler ~ session", session?.user.id);

  console.log("🚀 ~ file: send-feedback.ts ~ line 8 ~ handler ~ session", dayjs().toISOString());

  await prisma.feedback.create({
    data: {
      userId: session.user.id,
      date: dayjs().toISOString(),
      rating: req.body.rating,
      comment: req.body.comment,
    },
  });

  res.status(200);
}
