import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getBusyTimes } from '../../../lib/calendarClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { user } = req.query

    const currentUser = await prisma.user.findFirst({
        where: {
          username: user,
        },
        select: {
            credentials: true,
            timeZone: true
        }
    });

    const availability = await getBusyTimes(currentUser.credentials, req.query.dateFrom, req.query.dateTo);
    res.status(200).json(availability);
}
