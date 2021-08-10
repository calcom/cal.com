import prisma from "@lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

import runMiddleware, { checkAmiliAuth } from "../../../../lib/amili/middleware";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;
  const { bookingUid } = req.query;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await runMiddleware(req, res, checkAmiliAuth);

  try {
    const booking = await prisma.booking.findFirst({
      where: { uid: <string>bookingUid },
      include: {
        references: true,
      },
    });

    if (!booking) {
      const error = {
        message: "The booking not found!",
      };

      throw { error, status: 404 };
    }

    return res.status(200).json(booking);
  } catch (e) {
    const { error, status } = e;

    return res.status(status).json(error);
  }
};

export default handler;
