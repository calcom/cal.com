import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getBusyTimes } from '../../../lib/calendarClient';
import dayjs from "dayjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { user } = req.query

    const currentUser = await prisma.user.findFirst({
        where: {
          username: user,
        },
        select: {
            credentials: true,
            timeZone: true,
            bufferTime: true
        }
    });

    let availability = await getBusyTimes(currentUser.credentials, req.query.dateFrom, req.query.dateTo);

    availability = availability.map(a => ({
        start: dayjs(a.start).subtract(currentUser.bufferTime, 'minute').toString(),
        end: dayjs(a.end).add(currentUser.bufferTime, 'minute').toString()
    }));
  
    res.status(200).json(availability);
}
