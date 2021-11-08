import { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../../../lib/prisma";
import { CoachProfileProgramStatus } from "./sync-by-coach-profile";

interface IRequestPayload {
  status: CoachProfileProgramStatus;
}

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  const { eventTypeId } = req.query;
  const { status } = req.body as IRequestPayload;

  // Check valid method
  if (req.method !== "PATCH") res.status(405).send(null);

  try {
    const eventType = await prisma.eventType.update({
      where: {
        id: +eventTypeId,
      },
      data: {
        status,
      },
    });

    return res.status(200).send(eventType);
  } catch (e) {
    return res.status(400).send(null);
  }
};

export default handler;
