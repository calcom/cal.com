import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user } = req.query

  const schedules = await prisma.schedule.find({
    where: {
      eventTypeId: req.query.type,
    },
    select: {
      credentials: true,
      timeZone: true
    }
  });

  return res.status(202).send(null);
}
